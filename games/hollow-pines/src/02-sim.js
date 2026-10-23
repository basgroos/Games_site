/* Hollow Pines — match simulation: entities, abilities, perception, sound, tasks, fear, phases. */
(function (G) {
  'use strict';
  const HG = G.HG;
  const { clamp, lerp, mulberry32 } = HG.util;
  const T = HG.T, W = HG.W;

  // ---------- tuning ----------
  HG.DIFFICULTY = {
    easy:      { label: 'Easy',      monSpeed: 0.90, monVisionDark: 8,  monHear: 0.75, aggression: 0.55, hits: 2, battery: 0.65, tasks: 5, abilityCd: 1.35, botSkill: 0.10, monPatience: 1.35, monTasks: 7, monBotSkill: -0.25 },
    normal:    { label: 'Normal',    monSpeed: 1.00, monVisionDark: 11, monHear: 1.00, aggression: 0.75, hits: 2, battery: 1.00, tasks: 6, abilityCd: 1.00, botSkill: 0.05, monPatience: 1.0,  monTasks: 6, monBotSkill: 0 },
    hard:      { label: 'Hard',      monSpeed: 1.06, monVisionDark: 13, monHear: 1.20, aggression: 0.90, hits: 2, battery: 1.20, tasks: 6, abilityCd: 0.85, botSkill: 0.00, monPatience: 0.8,  monTasks: 6, monBotSkill: 0.15 },
    nightmare: { label: 'Nightmare', monSpeed: 1.10, monVisionDark: 15, monHear: 1.35, aggression: 1.0, hits: 2, battery: 1.40, tasks: 6, abilityCd: 0.70, botSkill: -0.05, monPatience: 0.6, monTasks: 5, monBotSkill: 0.3 }
  };
  HG.LENGTH = { short: { label: 'Short', minutes: 14, taskDelta: -2 }, normal: { label: 'Standard', minutes: 22, taskDelta: 0 }, long: { label: 'Long', minutes: 30, taskDelta: 1 } };

  // configurable ability table (cooldown/duration seconds, range metres, sound radius metres)
  HG.ABILITIES = {
    dash:     { key: 'Q',     name: 'Dash',     cooldown: 7.5, duration: 0.42, speed: 15.5, sound: 28 },
    crawl:    { key: 'C',     name: 'Crawl',    cooldown: 0.6, speed: 1.75, sound: 2.2 },
    ghost:    { key: 'E',     name: 'Ghost',    cooldown: 26,  duration: 6.5, speed: 3.1, sound: 1.2, warn: 0.6 },
    run:      { key: 'Shift', name: 'Run',      speed: 5.3, drain: 0.13, regen: 0.07, minStart: 0.35, sound: 22 },
    stalk:    { key: 'V',     name: 'Stalk',    speed: 2.05, sound: 1.6 },
    scream:   { key: 'R',     name: 'Scream',   cooldown: 42,  windup: 0.65, range: 19, panic: 1.7, sound: 70 },
    darkness: { key: 'F',     name: 'Darkness', cooldown: 32,  warn: 1.3, duration: 7.5, range: 16, sound: 14 }
  };
  // the creature's three attacks (configurable)
  HG.ATTACKS = {
    swipe:  { key: 'Left click',  name: 'Swipe',  range: 2.0, windup: 0.3, hitCd: 2.6, missCd: 1.25 },
    pounce: { key: 'Right click', name: 'Pounce', min: 3.0, max: 8.0, windup: 0.5, air: 0.55, speed: 13.5, cooldown: 15, stumble: 1.9, knockdown: 1.0, sound: 24 },
    grab:   { key: 'X',           name: 'Grab',   range: 2.0, windup: 0.22, cooldown: 15, hold: 3.2, dragSpeed: 1.25, missCd: 1.6, sound: 40 }
  };
  const SURV = { walk: 2.7, sprint: 5.0, jog: 3.75, crouch: 1.35, staminaDrain: 1 / 6, staminaRegen: 1 / 7, radius: 0.3, reach: 1.9 };
  const MON = { walk: 2.45, radius: 0.42, crawlRadius: 0.3, attackRange: 2.0, windup: 0.3, hitCd: 2.6, missCd: 1.25 };
  HG.SURV = SURV; HG.MON = MON;

  HG.ITEMS = {
    fuel: 'jerrycan of fuel', fuse: 'generator fuse', wrench: 'pipe wrench', relay: 'relay switch', cable: 'cable spool',
    storage_key: 'storage key', cutters: 'bolt cutters', radio_part: 'radio part', car_battery: 'car battery',
    spark_plugs: 'spark plugs', truck_keys: 'truck keys', breaker: 'breaker fuse', chainsaw: 'chainsaw',
    battery: 'flashlight batteries', medkit: 'first-aid kit'
  };
  const SPAWN = {
    fuel: ['shed_locker', 'shed_bench', 'truck_bed', 'base_crates', 'yard_shed_box', 'forest_car'],
    fuse: ['kitchen_drawer', 'storage_shelf', 'base_workbench', 'ps_cabinet', 'bed2_nightstand'],
    wrench: ['shed_toolbox', 'base_workbench', 'storage_shelf', 'truck_bed', 'tower_box'],
    relay: ['ps_crate', 'base_shelves', 'attic_boxes', 'tower_box', 'forest_tent'],
    cable: ['shed_bench', 'storage_boxes', 'ps_crate', 'attic_trunk', 'forest_pack1'],
    storage_key: ['base_chest', 'attic_chest', 'attic_trunk', 'bed1_dresser', 'bed1_nightstand', 'base_crates'],
    cutters: ['store_crate1', 'store_crate2'],
    radio_part: ['living_desk', 'attic_boxes', 'forest_stand', 'forest_pack2', 'bed2_dresser', 'tower_box', 'forest_cooler', 'living_sideboard', 'base_shelves'],
    car_battery: ['base_workbench', 'shed_locker', 'ps_crate', 'forest_car', 'yard_shed_box'],
    spark_plugs: ['shed_toolbox', 'storage_shelf', 'base_workbench', 'forest_tent', 'kitchen_drawer'],
    truck_keys: ['living_sideboard', 'kitchen_cabinet', 'bed2_dresser', 'bed1_dresser', 'living_desk'],
    breaker: ['kitchen_cabinet', 'storage_boxes', 'shed_toolbox', 'attic_chest', 'ps_cabinet'],
    chainsaw: ['shed_locker', 'shed_bench', 'yard_shed_box', 'truck_bed']
  };

  HG.TASK_TYPES = {
    generator: {
      title: 'Repair the generator', note: 'The house is on a dying circuit. The generator out back needs fuel, a fuse and a wrench.',
      steps: [
        { kind: 'deliver', items: ['fuel', 'fuse', 'wrench'], station: 'generator', label: 'Bring fuel, a fuse and a wrench to the generator' },
        { kind: 'hold', time: 30, station: 'generator', label: 'Repair the generator', verb: 'Repairing', noise: 14, sound: 'wrench' }
      ], done: s => { s.generatorRunning = true; s.generatorFixed = true; s.emitSound('generator_start', 60.1, 47, 0, 40, null); }
    },
    power: {
      title: 'Restore the power station', note: 'The substation east of the house controls the gate motor. Needs a relay and cable.',
      steps: [
        { kind: 'deliver', items: ['relay', 'cable'], station: 'power_panel', label: 'Bring a relay switch and cable to the power station' },
        { kind: 'puzzle', time: 22, station: 'power_panel', label: 'Rewire the control panel', verb: 'Rewiring', noise: 6, sound: 'wires' },
        { kind: 'hold', time: 9, station: 'power_panel', label: 'Throw the main switch', verb: 'Throwing switch', noise: 34, sound: 'switch' }
      ], done: s => { s.stationPowered = true; }
    },
    keys: {
      title: 'Cut the gate chain', note: 'The road gate is chained. Bolt cutters are locked in the storage building. Find its key somewhere dark.',
      steps: [
        { kind: 'deliver', items: ['storage_key'], station: 'storage_door', label: 'Find the storage key and unlock the storage building', unlock: true },
        { kind: 'deliver', items: ['cutters'], station: 'gate_chain', label: 'Bring the bolt cutters to the gate chain' },
        { kind: 'hold', time: 21, station: 'gate_chain', label: 'Cut the chain', verb: 'Cutting', noise: 16, sound: 'metal' }
      ], done: s => { s.chainCut = true; }
    },
    radio: {
      title: 'Build the radio', note: "Dad's old ham radio is in pieces. Three parts are scattered around. Assemble it at the kitchen table.",
      steps: [
        { kind: 'deliver', items: ['radio_part', 'radio_part', 'radio_part'], station: 'radio_table', label: 'Collect 3 radio parts and bring them to the kitchen table' },
        { kind: 'hold', time: 26, station: 'radio_table', label: 'Assemble the radio', verb: 'Assembling', noise: 5, sound: 'tinker' },
        { kind: 'hold', time: 36, station: 'radio_table', label: 'Call for help on the radio', verb: 'Transmitting', noise: 16, sound: 'static' }
      ], done: s => { s.rescueCalled = true; }
    },
    tower: {
      title: 'Send the tower signal', note: 'The radio tower to the north can broadcast an emergency beacon if someone keeps it running.',
      steps: [
        { kind: 'hold', time: 10, station: 'tower_cabinet', label: 'Switch on the transmitter', verb: 'Switching on', noise: 10, sound: 'switch' },
        { kind: 'zone', time: 80, station: 'tower_zone', label: 'Stay near the tower while the signal transmits', noise: 45, sound: 'beacon' }
      ], done: s => { s.beaconSent = true; }
    },
    vehicle: {
      title: 'Fix the truck', note: 'The pickup has a winch rated for the gate. It needs a battery, spark plugs and its keys.',
      steps: [
        { kind: 'deliver', items: ['car_battery', 'spark_plugs', 'truck_keys'], station: 'truck_hood', label: 'Bring a car battery, spark plugs and the truck keys to the truck' },
        { kind: 'hold', time: 28, station: 'truck_hood', label: 'Repair the engine', verb: 'Repairing', noise: 10, sound: 'wrench' },
        { kind: 'hold', time: 10, station: 'truck_hood', label: 'Start the truck', verb: 'Cranking', noise: 36, sound: 'engine' }
      ], done: s => { s.truckRunning = true; }
    },
    fusebox: {
      title: 'Reset the breakers', note: 'The breaker panel in the basement blew. Find a breaker fuse and reset it.',
      steps: [
        { kind: 'deliver', items: ['breaker'], station: 'fusebox', label: 'Bring a breaker fuse to the basement panel' },
        { kind: 'hold', time: 18, station: 'fusebox', label: 'Reset the breakers', verb: 'Resetting', noise: 8, sound: 'switch' }
      ], done: s => { s.breakersReset = true; }
    },
    roadblock: {
      title: 'Clear the fallen tree', note: 'A pine came down across the gate. Somebody has to cut it with a chainsaw. It will be loud.',
      steps: [
        { kind: 'deliver', items: ['chainsaw'], station: 'fallen_tree', label: 'Bring a chainsaw to the fallen tree' },
        { kind: 'hold', time: 39, station: 'fallen_tree', label: 'Cut the fallen tree', verb: 'Cutting', noise: 60, sound: 'chainsaw' }
      ], done: s => { s.removeFallenTree(); }
    }
  };

  const SURVIVOR_ROSTER = [
    { name: 'Mara', full: 'Mara Okafor', trait: 'Reckless', bravery: 0.85, smarts: 0.55, social: 0.35, pitch: 1.05, rate: 1.1, color: 0x6b2f2a, voice: 'f' },
    { name: 'Theo', full: 'Theo Lindqvist', trait: 'Cautious', bravery: 0.3, smarts: 0.75, social: 0.8, pitch: 0.9, rate: 0.95, color: 0x2e4a5e, voice: 'm' },
    { name: 'Juno', full: 'Juno Reyes', trait: 'Analytical', bravery: 0.55, smarts: 0.9, social: 0.5, pitch: 1.15, rate: 1.0, color: 0x4d5a2f, voice: 'f' },
    { name: 'Danny', full: 'Danny Kowalski', trait: 'Jittery', bravery: 0.2, smarts: 0.4, social: 0.9, pitch: 1.0, rate: 1.2, color: 0x5e4b2a, voice: 'm' },
    { name: 'Ines', full: 'Ines Moreau', trait: 'Steady', bravery: 0.7, smarts: 0.7, social: 0.6, pitch: 1.0, rate: 0.9, color: 0x3b3346, voice: 'f' },
    { name: 'Sam', full: 'Sam Ito', trait: 'Loyal', bravery: 0.6, smarts: 0.6, social: 0.95, pitch: 0.85, rate: 1.0, color: 0x2f3f39, voice: 'm' }
  ];
  HG.ROSTER = SURVIVOR_ROSTER;

  // ---------- simulation ----------
  function Sim(world, opts) {
    this.world = world;
    this.opts = opts;
    this.seed = opts.seed || (Math.random() * 1e9) | 0;
    this.rnd = mulberry32(this.seed);
    this.diff = HG.DIFFICULTY[opts.difficulty || 'normal'];
    this.len = HG.LENGTH[opts.length || 'normal'];
    this.mode = opts.mode || 'survivor';
    this.time = 0;
    this.timeLimit = this.len.minutes * 60;
    this.events = [];
    this.sounds = [];   // recent sound events for perception
    this.items = [];    // loose items on ground
    this.phase = 1;
    this.over = false;
    this.result = null;
    this.powerFailed = false;
    this.generatorRunning = false;
    this.generatorFixed = false;
    this.stationPowered = false;
    this.gateState = 'closed'; // closed | opening | open
    this.gateTimer = 0;
    this.darknessFields = [];
    this.team = { items: new Map(), searched: new Set(), sightings: [], missing: [], dangers: [], lastSighting: null, regroupT: -99 };
    this.weather = opts.weather || 'fog';
    this.nextThunder = 30 + this.rnd() * 60;
    this.lampSuppress = {};
    this.resetWorldState();
    this.spawnEntities();
    // online: human survivors (their computers report position; the host runs everything else)
    this.humans = [];
    for (const h of opts.humans || []) {
      const s = this.survivors[h.slot]; if (!s) continue;
      s.isPlayer = true; s.netId = h.id; s.remote = h.id !== opts.localId; s.name = s.full = String(h.name || 'Player').slice(0, 16); s.netEpoch = 0;
      s.human = true;
      this.humans.push(s);
      if (h.id === opts.localId) this.player = s;
    }
    this.setupTasks();
    this.spawnItems();
    this.stats = { hits: 0, chases: 0, abilityUses: {} };
    this.director = new HG.Director(this);
    this.monster.ai = this.monster.isPlayer && !opts.allBots ? null : new HG.MonsterAI(this, this.monster);
    for (const s of this.survivors) if ((!s.isPlayer || opts.allBots) && !s.human) s.ai = new HG.SurvivorAI(this, s);
  }
  HG.Sim = Sim;
  const P = Sim.prototype;

  P.resetWorldState = function () {
    const w = this.world;
    for (const d of w.doors) {
      d.open = false; d.angle = 0; d.lastUse = -99;
      d.locked = d === w.storageDoor;
    }
    // a few interior doors start ajar
    for (const d of w.doors) if (!d.locked && d.level === 0 && this.rnd() < 0.35) d.open = true;
    for (const c of w.containers) { c.items = []; c.searched = false; c.searchedBy = null; c.locked = c.id.startsWith('store_'); }
    for (const h of w.hides) { h.occupant = null; h.lastOpened = -99; }
    for (const b of w.gateBoxes) b.enabled = true;
    w.markDirty();
    for (let x = 62; x <= 65; x++) w.set(0, x, 114, T.FENCE);
    if (w.fallenBoxes) for (const b of w.fallenBoxes) b.enabled = false;
    for (let x = 56; x <= 71; x++) if (w.get(0, x, 112) === T.LOG) w.set(0, x, 112, T.OPEN);
    for (let z = 112; z <= 113; z++) for (const x of [56, 57, 70, 71]) if (w.get(0, x, z) === T.LOG) w.set(0, x, z, T.OPEN);
    w._doorMap = null;
  };

  P.makeSurvivor = function (prof, i, isPlayer) {
    const spawn = [[57.2, 64.8], [59.5, 63.2], [61.2, 64.8], [55.8, 65.4], [60.6, 66.1], [58.6, 62.6]][i];
    const skill = this.mode === 'monster' ? this.diff.monBotSkill : this.diff.botSkill;
    return {
      id: 's' + i, kind: 'survivor', name: prof.name, full: prof.full, trait: prof.trait, prof,
      bravery: clamp(prof.bravery + (this.rnd() - 0.5) * 0.1, 0.05, 1), smarts: clamp(prof.smarts + skill + (this.rnd() - 0.5) * 0.1, 0.05, 1), social: prof.social,
      color: prof.color, isPlayer, x: spawn[0], z: spawn[1], level: 0, y: 0.5, yaw: Math.PI * (0.8 + this.rnd() * 0.4), pitch: 0,
      vx: 0, vz: 0, radius: SURV.radius, speed: 0, moving: false, sprinting: false, crouching: false, stamina: 1,
      flashlightOn: !isPlayer ? true : true, battery: 0.85 + this.rnd() * 0.15, batteries: isPlayer ? 1 : (this.rnd() < 0.5 ? 1 : 0), lightForcedOff: 0, lightFlicker: 0,
      carry: [], health: 2, burstT: 0, alive: true, escaped: false, caught: false, hidden: null, fear: 0.15, panicT: 0, freezeT: 0,
      interact: null, stepAcc: 0, ctrl: blankCtrl(), lastSeenMonster: -99, seesMonster: false, heardT: -99, bleedT: 0,
      caughtAt: null, escapedAt: null, deliveries: 0, taskTime: 0, voiceCd: 0, lastSayT: -99
    };
  };
  function blankCtrl() { return { mx: 0, mz: 0, yaw: null, pitch: null, sprint: false, crouch: false, use: false, usePressed: false, useTarget: null, toggleLight: false, reload: false, run: false, crawl: null, dash: false, ghost: false, scream: false, darkness: false, stalk: null, attack: false, pounce: false, grab: false, struggle: false, medkit: false }; }
  HG.blankCtrl = blankCtrl;

  P.spawnEntities = function () {
    const roster = SURVIVOR_ROSTER.slice();
    // shuffle (keep variety each match)
    for (let i = roster.length - 1; i > 0; i--) { const j = Math.floor(this.rnd() * (i + 1)); [roster[i], roster[j]] = [roster[j], roster[i]]; }
    this.survivors = [];
    const n = 5;
    for (let i = 0; i < n; i++) {
      let prof = roster[i];
      const isPlayer = this.mode === 'survivor' && i === 0;
      if (isPlayer) prof = Object.assign({}, prof, { trait: 'Player', bravery: 0.6, smarts: 0.7, social: 0.5 });
      this.survivors.push(this.makeSurvivor(prof, i, isPlayer));
    }
    // monster spawns deep in the forest, far from the house
    const w = this.world;
    let sp = null;
    for (let k = 0; k < 200 && !sp; k++) {
      const x = 8 + this.rnd() * 112, z = 8 + this.rnd() * 98;
      if (Math.hypot(x - 62, z - 61) < 42) continue;
      if (w.passable(0, Math.floor(x), Math.floor(z), {}) && w.get(0, Math.floor(x), Math.floor(z)) === T.OPEN) sp = { x: Math.floor(x) + 0.5, z: Math.floor(z) + 0.5 };
    }
    sp = sp || { x: 15.5, z: 20.5 };
    this.monster = {
      id: 'm', kind: 'monster', name: 'The Hollow', isPlayer: this.mode === 'monster',
      x: sp.x, z: sp.z, level: 0, y: 0, yaw: 0, pitch: 0, vx: 0, vz: 0, radius: MON.radius, speed: 0, moving: false,
      mode: 'walk', crawling: false, crawlT: 0, stalking: false, ghostT: 0, ghostWarn: 0, running: false, runEnergy: 1,
      dashT: 0, dashDir: null, cd: { dash: 0, ghost: 0, scream: 0, darkness: 0, crawl: 0, pounce: 0, grab: 0 }, screamWind: 0, darknessWarn: 0,
      pounceWind: 0, pounceT: 0, pounceDir: null, airY: 0, stumbleT: 0, grabWind: 0, grabbed: null, grabT: 0, lastAttack: null,
      attackWind: 0, attackCd: 0, recoverT: 0, doorT: 0, doorTarget: null, stepAcc: 0, ctrl: blankCtrl(), headTurn: 0,
      eyesT: 0, revealT: 0, catches: 0, lastAttackHit: false, carriedVictim: null, searchHide: null, searchHideT: 0, lunge: 0, seenBy: 0
    };
    this.player = this.mode === 'survivor' ? this.survivors[0] : this.monster;
  };

  P.setupTasks = function () {
    const types = Object.keys(HG.TASK_TYPES);
    let count = (this.mode === 'monster' ? this.diff.monTasks : this.diff.tasks) + this.len.taskDelta;
    count = clamp(count, 3, types.length);
    // shuffle
    for (let i = types.length - 1; i > 0; i--) { const j = Math.floor(this.rnd() * (i + 1)); [types[i], types[j]] = [types[j], types[i]]; }
    // generator and fusebox overlap thematically; avoid both in small sets
    let chosen = types.slice(0, count);
    if (count <= 4 && chosen.includes('generator') && chosen.includes('fusebox')) chosen[chosen.indexOf('fusebox')] = types[count];
    this.tasks = chosen.map((type, i) => {
      const def = HG.TASK_TYPES[type];
      return {
        id: type, type, def, title: def.title, note: def.note, stepIdx: 0, done: false, doneAt: null,
        steps: def.steps.map(st => Object.assign({}, st, { delivered: [], progress: 0 }))
      };
    });
    this.fallenTree = this.tasks.some(t => t.type === 'roadblock');
    if (this.fallenTree) this.placeFallenTree();
  };

  P.placeFallenTree = function () {
    const w = this.world;
    if (!w.fallenBoxes) {
      w.fallenBoxes = [
        w.addBox({ x0: 56.2, z0: 111.6, x1: 71.8, z1: 112.5, level: 0, kind: 'fallen', h: 1.0, y0: 0, flags: HG.F_LOW }),
        w.addBox({ x0: 56.2, z0: 112.5, x1: 57.6, z1: 114.4, level: 0, kind: 'fallen', h: 1.4, y0: 0, flags: HG.F_LOW }),
        w.addBox({ x0: 70.4, z0: 112.5, x1: 71.8, z1: 114.4, level: 0, kind: 'fallen', h: 1.4, y0: 0, flags: HG.F_LOW })
      ];
      w.buildHash();
    }
    this.treeBoxes = w.fallenBoxes;
    for (const b of this.treeBoxes) b.enabled = true;
    for (let x = 56; x <= 71; x++) w.set(0, x, 112, T.LOG);
    for (let z = 112; z <= 113; z++) { w.set(0, 56, z, T.LOG); w.set(0, 57, z, T.LOG); w.set(0, 70, z, T.LOG); w.set(0, 71, z, T.LOG); }
    w.markDirty();
  };
  P.removeFallenTree = function () {
    const w = this.world;
    for (const b of this.treeBoxes) b.enabled = false;
    for (let x = 56; x <= 71; x++) w.set(0, x, 112, T.OPEN);
    for (let z = 112; z <= 113; z++) { w.set(0, 56, z, T.OPEN); w.set(0, 57, z, T.OPEN); w.set(0, 70, z, T.OPEN); w.set(0, 71, z, T.OPEN); }
    this.fallenTree = false;
    w.markDirty();
    this.events.push({ type: 'treeCleared' });
  };

  P.containerById = function (id) { return this.world.containers.find(c => c.id === id); };

  P.spawnItems = function () {
    const w = this.world;
    const put = (kind, pool, strict) => {
      let opts = pool.map(id => this.containerById(id)).filter(c => c && c.items.length < 2);
      if (strict) { const free = opts.filter(c => !c.items.some(i => i !== 'battery' && i !== 'medkit')); if (free.length) opts = free; }
      // prefer containers with fewer items
      opts.sort((a, b) => a.items.length - b.items.length + (this.rnd() - 0.5) * 1.2);
      const c = opts[0];
      if (c) c.items.push(kind);
      return c;
    };
    for (const t of this.tasks) for (const st of t.steps) if (st.kind === 'deliver') for (const it of st.items) put(it, SPAWN[it], true);
    const all = w.containers.filter(c => !c.locked).map(c => c.id);
    for (let i = 0; i < 9; i++) put('battery', all);
    for (let i = 0; i < 3; i++) put('medkit', all.filter(id => !id.startsWith('forest')));
    // a couple of spare required items so a lost survivor does not doom the run
    const spares = ['fuel', 'radio_part', 'fuse'];
    for (const s of spares) if (this.tasks.some(t => t.steps.some(st => st.items && st.items.includes(s))) && this.rnd() < 0.6) put(s, SPAWN[s]);
  };

  // ---------- events / sound ----------
  P.emit = function (e) { this.events.push(e); };
  P.emitSound = function (kind, x, z, level, radius, src, extra) {
    const s = Object.assign({ kind, x, z, level, radius, src, t: this.time }, extra || {});
    this.sounds.push(s);
    this.events.push(Object.assign({ type: 'sound' }, s));
    return s;
  };
  // how loud (0..1) a sound is for a listener, accounting for walls and floors
  P.audibility = function (s, lx, lz, ll) {
    const d = Math.hypot(s.x - lx, s.z - lz);
    const walls = this.world.wallsBetween(ll, lx, lz, s.level, s.x, s.z);
    const eff = d * (1 + walls * 0.55) + Math.abs(ll - s.level) * 6;
    return clamp(1 - eff / s.radius, 0, 1);
  };

  P.say = function (who, text, opts) {
    opts = opts || {};
    if (!who.alive && !opts.mimic) return;
    who.lastSayT = this.time;
    this.events.push({ type: 'say', who: who.id, name: opts.mimic ? opts.mimicName : who.name, text, whisper: !!opts.whisper, x: who.x, z: who.z, level: who.level, voice: opts.voice || (who.prof && who.prof.voice), pitch: opts.pitch || (who.prof && who.prof.pitch) || 1, rate: (who.prof && who.prof.rate) || 1, radio: !opts.mimic, mimic: !!opts.mimic, isPlayer: who.isPlayer });
    if (!opts.mimic) this.emitSound(opts.whisper ? 'whisper' : 'voice', who.x, who.z, who.level, opts.whisper ? 4 : (opts.shout ? 26 : 12), who);
    else this.emitSound('voice', who.x, who.z, who.level, 18, who, { mimic: true });
  };

  // ---------- perception ----------
  P.lampLit = function (x, z, level) {
    for (const L of this.world.lamps) if (L.on && L.level === level) {
      const d = Math.hypot(L.x - x, L.z - z);
      if (d < L.r * 0.85) {
        // must be in the same building region roughly: cheap LOS check for indoor lamps
        if (this.world.los(level, L.x, L.z, x, z).clear) return 1 - d / L.r * 0.6;
      }
    }
    return 0;
  };
  P.flashlightActive = function (s) { return s.alive && !s.escaped && !s.hidden && s.flashlightOn && s.battery > 0 && s.lightForcedOff <= 0; };

  // Can the monster see survivor s? returns 0 (no), or confidence 0..1
  P.monsterSees = function (m, s) {
    if (!s.alive || s.escaped || s.hidden || s.level !== m.level) return 0;
    const dx = s.x - m.x, dz = s.z - m.z; const d = Math.hypot(dx, dz);
    if (d > 60) return 0;
    const fx = -Math.sin(m.yaw), fz = -Math.cos(m.yaw);
    const cos = (dx * fx + dz * fz) / (d || 1);
    const lit = this.flashlightActive(s);
    const lamp = this.lampLit(s.x, s.z, s.level);
    let range = this.diff.monVisionDark;
    if (lit) range = 38; else if (lamp > 0) range = Math.max(range, 30 * lamp);
    const cover = s.level === 0 ? this.world.cover[Math.floor(s.z) * W + Math.floor(s.x)] : 0;
    if (!lit) { if (s.crouching) range *= cover === 1 ? 0.35 : 0.65; if (cover === 2) range *= 0.55; }
    if (d < 2.2) range = 99; // too close to miss
    const fovCos = d < 4 ? -0.2 : (lit ? 0.17 : 0.4); // flashlights are visible from wider angles
    if (cos < fovCos) return 0;
    if (d > range) {
      // beam detection: a lit flashlight is visible far away even if the holder isn't
      return 0;
    }
    if (m.ghostT > 0 && false) return 0;
    const l = this.world.los(m.level, m.x, m.z, s.x, s.z);
    if (!l.clear) return 0;
    if (l.bush >= 2 && !lit && d > 4) return 0;
    return clamp(1 - d / (range + 1) + 0.3, 0.2, 1);
  };
  // Beam glimpse: the monster sees a flashlight beam from far away — knows roughly where it is
  P.monsterSeesBeam = function (m, s) {
    if (!this.flashlightActive(s) || s.level !== m.level) return false;
    const dx = s.x - m.x, dz = s.z - m.z; const d = Math.hypot(dx, dz);
    if (d < 8 || d > 62) return false;
    const fx = -Math.sin(m.yaw), fz = -Math.cos(m.yaw);
    if ((dx * fx + dz * fz) / d < -0.1) return false;
    const l = this.world.los(m.level, m.x, m.z, s.x, s.z);
    return l.clear || (l.bush < 3 && this.rnd() < 0.3);
  };
  // Can survivor s see the monster? returns {seen, faint}
  P.survivorSees = function (s, m) {
    const r = { seen: false, faint: false, dist: 99, eyes: false };
    if (!s.alive || s.escaped || m.level !== s.level) return r;
    const dx = m.x - s.x, dz = m.z - s.z; const d = Math.hypot(dx, dz); r.dist = d;
    if (d > 45) return r;
    const fx = -Math.sin(s.yaw), fz = -Math.cos(s.yaw);
    const cos = (dx * fx + dz * fz) / (d || 1);
    if (s.hidden) { if (cos < 0.5 || d > 12) return r; }
    if (cos < 0.25 && d > 1.5) return r; // ~150° field of view
    const inBeam = this.flashlightActive(s) && cos > Math.cos(0.42) && d < 22;
    const lamp = this.lampLit(m.x, m.z, m.level);
    let vis = 0;
    let range = 4.5;
    if (m.crawling) range = 2.5;
    if (inBeam) vis = 1;
    else if (lamp > 0 && d < 26) vis = 0.8;
    else if (this.lightning > 0.5 && m.level === 0 && d < 30) vis = 0.7;
    else if (d < range) vis = 0.6;
    // somebody else's flashlight lighting the monster
    if (!vis) for (const o of this.survivors) if (o !== s && this.flashlightActive(o) && o.level === m.level) {
      const ox = m.x - o.x, oz = m.z - o.z, od = Math.hypot(ox, oz);
      if (od < 18 && (ox * -Math.sin(o.yaw) + oz * -Math.cos(o.yaw)) / od > 0.9 && d < 24) { vis = 0.7; break; }
    }
    if (!vis) return r;
    const cover = m.level === 0 ? this.world.cover[Math.floor(m.z) * W + Math.floor(m.x)] : 0;
    if (m.crawling && cover === 1 && !(inBeam && d < 10)) return r;
    if (m.ghostT > 0) { if (!(inBeam && d < 9)) return r; r.faint = true; }
    const l = this.world.los(s.level, s.x, s.z, m.x, m.z);
    if (!l.clear) return r;
    if (l.bush >= 2 && !inBeam) return r;
    r.seen = true; r.eyes = inBeam && !m.crawling && d > 6;
    return r;
  };

  // ---------- doors ----------
  P.toggleDoor = function (who, door, forceOpen) {
    if (door.locked) return false;
    if (door.open && !forceOpen) {
      // don't close onto someone
      const cx = door.cx + 0.5, cz = door.cz + 0.5;
      for (const e of this.survivors.concat([this.monster])) if (e.level === door.level && Math.hypot(e.x - cx, e.z - cz) < 0.65 && e !== who) return false;
      if (Math.hypot(who.x - cx, who.z - cz) < 0.55) return false;
      door.open = false;
    } else door.open = true;
    door.lastUse = this.time;
    door.openedBy = who && who.kind;
    if (door.open && who) {
      // swing away from the opener
      const side = door.axis === 'h' ? Math.sign(who.z - (door.cz + 0.5)) : Math.sign(who.x - (door.cx + 0.5));
      door.swing = side || 1;
    }
    const loud = who && who.kind === 'monster' && who.running ? 22 : (who && who.sprinting ? 12 : 7);
    this.emitSound(door.open ? 'door_open' : 'door_close', door.cx + 0.5, door.cz + 0.5, door.level, loud, who, { doorId: door.id, slow: who && who.kind === 'monster' && !who.running });
    return true;
  };
  P.doorNear = function (e, maxD) {
    let best = null, bd = maxD || 1.6;
    for (const d of this.world.doors) {
      if (d.level !== e.level) continue;
      const dd = Math.hypot(d.cx + 0.5 - e.x, d.cz + 0.5 - e.z);
      if (dd < bd) { bd = dd; best = d; }
    }
    return best;
  };

  // ---------- interaction targets ----------
  P.stepFor = function (stationId) {
    const out = [];
    for (const t of this.tasks) {
      if (t.done) continue;
      const st = t.steps[t.stepIdx];
      if (st.station === stationId) out.push({ task: t, step: st });
    }
    return out;
  };
  P.neededItems = function () {
    const need = {};
    for (const t of this.tasks) {
      if (t.done) continue;
      for (let i = t.stepIdx; i < t.steps.length; i++) {
        const st = t.steps[i];
        if (st.kind !== 'deliver') continue;
        const rem = st.items.slice();
        for (const d of st.delivered) { const k = rem.indexOf(d); if (k >= 0) rem.splice(k, 1); }
        for (const it of rem) need[it] = (need[it] || 0) + 1;
      }
    }
    return need;
  };
  // Returns a list of interactables near survivor s
  P.interactablesFor = function (s) {
    const w = this.world, out = [];
    const near = (x, z, l, r) => l === s.level && Math.hypot(x - s.x, z - s.z) < r;
    for (const d of w.doors) if (near(d.cx + 0.5, d.cz + 0.5, d.level, 1.5)) out.push({ kind: 'door', ref: d, x: d.cx + 0.5, z: d.cz + 0.5, label: d.locked ? 'Locked' : (d.open ? 'Close door' : 'Open door'), instant: true, disabled: d.locked });
    for (const c of w.containers) if (near(c.x, c.z, c.level, 1.55) && !c.locked) {
      if (!c.searched) out.push({ kind: 'search', ref: c, x: c.x, z: c.z, label: 'Search ' + c.name, time: c.searchTime });
      else if (c.items.length) out.push({ kind: 'take', ref: c, x: c.x, z: c.z, label: 'Take ' + HG.ITEMS[c.items[0]], time: 0.5 });
    }
    for (const it of this.items) if (near(it.x, it.z, it.level, 1.4)) out.push({ kind: 'pickup', ref: it, x: it.x, z: it.z, label: 'Pick up ' + HG.ITEMS[it.kind], time: 0.5 });
    for (const h of w.hides) if (near(h.ix, h.iz, h.level, 1.0) && !h.occupant && !s.hidden) out.push({ kind: 'hide', ref: h, x: h.x, z: h.z, label: 'Hide in ' + h.name, instant: true });
    for (const id in w.stations) {
      const st = w.stations[id];
      if (!near(st.x, st.z, st.level, st.r + (id === 'tower_zone' ? 0 : 0.4))) continue;
      for (const { task, step } of this.stepFor(id)) {
        if (step.kind === 'deliver') {
          const rem = step.items.slice(); for (const d of step.delivered) rem.splice(rem.indexOf(d), 1);
          const has = s.carry.find(c => rem.includes(c));
          if (has) out.push({ kind: 'deliver', ref: st, task, step, item: has, x: st.x, z: st.z, label: (step.unlock ? 'Unlock with ' : 'Use ') + HG.ITEMS[has], time: step.unlock ? 3 : 2 });
          else out.push({ kind: 'info', ref: st, task, step, x: st.x, z: st.z, label: 'Needs: ' + rem.map(i => HG.ITEMS[i]).join(', '), disabled: true });
        } else if (step.kind === 'hold' || step.kind === 'puzzle') {
          out.push({ kind: step.kind, ref: st, task, step, x: st.x, z: st.z, label: step.label, time: step.time, hold: true });
        }
      }
      if (id === 'generator' && this.generatorFixed && !this.generatorRunning) out.push({ kind: 'restart', ref: st, x: st.x, z: st.z, label: 'Restart the generator', time: 4, hold: true });
    }
    for (const o of this.survivors) if (o !== s && o.alive && !o.escaped && o.health === 1 && !o.hidden && near(o.x, o.z, o.level, 1.6)) out.push({ kind: 'patch', ref: o, x: o.x, z: o.z, label: 'Patch up ' + o.name, time: 5, hold: true });
    return out;
  };
  // Focus for the player: best interactable in front
  P.focusFor = function (s) {
    if (s.hidden) return { kind: 'unhide', ref: s.hidden, label: 'Leave hiding spot', instant: true };
    const list = this.interactablesFor(s);
    const fx = -Math.sin(s.yaw), fz = -Math.cos(s.yaw);
    let best = null, bs = -9;
    for (const it of list) {
      const dx = it.x - s.x, dz = it.z - s.z, d = Math.hypot(dx, dz) || 0.01;
      let score = (dx * fx + dz * fz) / d - d * 0.15;
      if (it.kind === 'patch' || it.kind === 'hold' || it.kind === 'puzzle' || it.kind === 'deliver') score += 0.35;
      if (it.kind === 'info') score -= 0.3;
      if (it.kind === 'door') score -= 0.05;
      if ((dx * fx + dz * fz) / d < 0.25 && d > 0.9 && it.kind !== 'patch') continue;
      if (score > bs) { bs = score; best = it; }
    }
    return best;
  };

  P.startInteract = function (s, it) {
    if (!it || it.disabled) return;
    if (it.kind === 'door') { this.toggleDoor(s, it.ref); return; }
    if (it.kind === 'hide') { this.enterHide(s, it.ref); return; }
    if (it.kind === 'unhide') { this.exitHide(s); return; }
    s.interact = { kind: it.kind, ref: it.ref, task: it.task, step: it.step, item: it.item, progress: 0, time: it.time || 1, x: it.x, z: it.z, label: it.label };
  };

  P.enterHide = function (s, h) {
    if (h.occupant) return;
    h.occupant = s; s.hidden = h; s.lightBeforeHide = s.flashlightOn; s.flashlightOn = false; s.interact = null;
    s.hideX = s.x; s.hideZ = s.z; s.x = h.x; s.z = h.z; s.yaw = h.yaw;
    s.hiddenAt = this.time;
    this.emitSound('hide', h.x, h.z, h.level, 5, s);
  };
  P.exitHide = function (s) {
    const h = s.hidden; if (!h) return;
    h.occupant = null; s.hidden = null; s.x = h.ix; s.z = h.iz; s.yaw = h.yaw;
    if (s.isPlayer && s.lightBeforeHide && s.battery > 0) s.flashlightOn = true;
    this.emitSound('hide', h.x, h.z, h.level, 5, s);
  };

  P.completeInteract = function (s, ia) {
    const w = this.world;
    switch (ia.kind) {
      case 'search': {
        const c = ia.ref; c.searched = true; c.searchedBy = s.id;
        this.team.searched.add(c.id);
        const found = this.takeFromContainer(s, c);
        this.emit({ type: 'searched', who: s.id, container: c.id, found });
        if (s.ai) s.ai.onSearched(c, found);
        else this.playerFound(s, c, found);
        break;
      }
      case 'take': { const found = this.takeFromContainer(s, ia.ref); if (s.ai) s.ai.onSearched(ia.ref, found); else this.playerFound(s, ia.ref, found); break; }
      case 'pickup': {
        const it = ia.ref; const idx = this.items.indexOf(it); if (idx < 0) break;
        if (it.kind === 'battery') { if (s.batteries < 3) { s.batteries++; this.items.splice(idx, 1); } }
        else if (s.carry.length < 2) { s.carry.push(it.kind); this.items.splice(idx, 1); this.team.items.delete('loose:' + it.id); }
        this.emitSound('pickup', s.x, s.z, s.level, 3, s);
        break;
      }
      case 'deliver': {
        const st = ia.step, t = ia.task;
        const k = s.carry.indexOf(ia.item); if (k < 0) break;
        s.carry.splice(k, 1); st.delivered.push(ia.item); s.deliveries++;
        this.emitSound('deliver', s.x, s.z, s.level, 6, s);
        if (st.unlock) { w.storageDoor.locked = false; w.markDirty(); for (const c of w.containers) if (c.id.startsWith('store_')) c.locked = false; this.toggleDoor(s, w.storageDoor, true); }
        if (st.delivered.length >= st.items.length) this.advanceStep(t, s);
        else this.emit({ type: 'progress', task: t.id, who: s.id });
        break;
      }
      case 'hold': case 'puzzle': break; // handled by progress
      case 'restart': this.generatorRunning = true; this.emitSound('generator_start', 60.1, 47, 0, 40, s); this.emit({ type: 'generator', on: true }); break;
      case 'patch': { const o = ia.ref; if (o.alive && o.health === 1) { o.health = 2; o.bleedT = 0; this.emit({ type: 'patched', who: o.id, by: s.id }); if (s.ai) s.ai.onPatched(o); if (o.ai) o.ai.onPatchedBy(s); } break; }
      case 'medkit': if (s.health === 1) { s.health = 2; const k = s.carry.indexOf('medkit'); if (k >= 0) s.carry.splice(k, 1); } break;
    }
  };
  P.playerFound = function (s, c, found) {
    if (!found.length && !c.items.length) { this.emit({ type: 'toast', who: s.id, text: 'Nothing useful in the ' + c.name + '.' }); return; }
    for (const f of found) this.emit({ type: 'toast', who: s.id, text: 'Found ' + HG.ITEMS[f] + '.' });
    // player calls it out to the team over the radio
    const need = this.neededItems();
    const useful = found.filter(f => need[f]);
    if (useful.length) this.say(s, `Got the ${HG.ITEMS[useful[0]]}.`, {});
    for (const left of c.items) {
      this.team.items.set('c:' + c.id + ':' + left, { kind: left, container: c.id, x: c.x, z: c.z, level: c.level });
      if (need[left]) { this.emit({ type: 'toast', who: s.id, text: 'No room to carry the ' + HG.ITEMS[left] + '. It stays in the ' + c.name + '.' }); this.say(s, `There's ${HG.ITEMS[left]} ${this.world.regionName(c.level, c.x, c.z)}. Can't carry it.`, {}); }
    }
  };
  P.takeFromContainer = function (s, c) {
    const found = [];
    const need = this.neededItems();
    // take needed items first
    c.items.sort((a, b) => (need[b] ? 1 : 0) - (need[a] ? 1 : 0));
    for (let i = 0; i < c.items.length; i++) {
      const it = c.items[i];
      let took = false;
      if (it === 'battery') { if (s.batteries < 3) { s.batteries++; took = true; } }
      else if (s.carry.length < 2 && (need[it] || (it === 'medkit' && !s.carry.includes('medkit')))) { s.carry.push(it); took = true; }
      if (took) { found.push(it); c.items.splice(i, 1); i--; this.team.items.delete('c:' + c.id + ':' + it); }
    }
    for (const it of c.items) this.team.items.set('c:' + c.id + ':' + it, { kind: it, container: c.id, x: c.x, z: c.z, level: c.level });
    return found;
  };

  P.advanceStep = function (t, who) {
    t.stepIdx++;
    if (t.stepIdx >= t.steps.length) {
      t.done = true; t.doneAt = this.time;
      if (t.def.done) t.def.done(this);
      this.emit({ type: 'taskDone', task: t.id, title: t.title, who: who && who.id });
      for (const s of this.survivors) if (s.alive) s.fear = clamp(s.fear - 0.18, 0, 1);
      if (this.tasks.every(x => x.done)) this.startGate();
    } else this.emit({ type: 'progress', task: t.id, who: who && who.id, step: t.stepIdx });
  };
  P.startGate = function () {
    if (this.gateState !== 'closed') return;
    this.gateState = 'opening'; this.gateTimer = 30;
    this.phase = 5;
    this.emit({ type: 'gateOpening' });
  };

  // ---------- update ----------
  P.update = function (dt) {
    if (this.over) return;
    dt = Math.min(dt, 0.05);
    this.time += dt;
    // prune sounds
    if (this.sounds.length > 80) this.sounds = this.sounds.filter(s => this.time - s.t < 2);
    this.updatePhase(dt);
    this.updateLamps(dt);
    this.director.update(dt);
    // AI decides
    for (const s of this.survivors) if (s.ai && s.alive && !s.escaped) s.ai.update(dt);
    if (this.monster.ai) this.monster.ai.update(dt);
    // physics
    for (const s of this.survivors) if (s.alive && !s.escaped) this.updateSurvivor(s, dt);
    this.updateMonster(this.monster, dt);
    this.updateTasks(dt);
    this.updateGate(dt);
    this.updateFear(dt);
    this.checkEnd();
  };

  P.updatePhase = function (dt) {
    const done = this.tasks.filter(t => t.done).length, total = this.tasks.length;
    const prog = done / total, tf = this.time / this.timeLimit;
    let ph = this.phase;
    if (this.gateState !== 'closed') ph = 5;
    else if (total - done <= 1 || tf > 0.75) ph = 4;
    else if (prog >= 0.34 || tf > 0.38) ph = 3;
    else if (this.time > 40) ph = 2;
    else ph = 1;
    if (ph > this.phase) {
      this.phase = ph;
      this.emit({ type: 'phase', phase: ph });
      if (ph === 3 && !this.powerFailed) {
        this.powerFailed = true;
        if (this.generatorRunning) this.generatorRunning = false;
        this.emit({ type: 'powerFail' });
        this.emitSound('power_fail', 62, 61, 0, 30, null);
      }
    }
    // thunder / lightning
    this.lightning = Math.max(0, (this.lightning || 0) - dt * 4);
    if (this.weather === 'rain' && this.time > this.nextThunder) {
      this.nextThunder = this.time + 25 + this.rnd() * 55;
      this.lightning = 1.6;
      this.emit({ type: 'lightning', delay: 0.8 + this.rnd() * 3 });
    }
  };
  P.houseCircuit = function () { return (!this.powerFailed || this.generatorRunning || this.breakersReset); };
  P.updateLamps = function (dt) {
    for (const f of this.darknessFields) f.t -= dt;
    this.darknessFields = this.darknessFields.filter(f => f.t > 0);
    for (const L of this.world.lamps) {
      let on;
      switch (L.circuit) {
        case 'house': on = this.houseCircuit(); break;
        case 'generator': on = this.generatorRunning; break;
        case 'station': on = !!this.stationPowered; break;
        case 'shed': on = !this.powerFailed || this.generatorRunning; break;
        case 'gate': on = this.gateState !== 'closed'; break;
        default: on = true;
      }
      let dark = 0;
      for (const f of this.darknessFields) if (f.level === L.level && Math.hypot(f.x - L.x, f.z - L.z) < f.r) dark = Math.max(dark, f.warn > 0 ? 0.5 : 1);
      // the old wiring flickers when not on generator power
      const weak = L.circuit === 'house' && !this.generatorRunning && !this.breakersReset;
      L.flick = Math.max(0, L.flick - dt);
      if (on && weak && this.rnd() < dt * 0.05) L.flick = 0.15 + this.rnd() * 0.6;
      if (dark === 0.5 && this.rnd() < dt * 8) L.flick = 0.1;
      L.on = on && dark < 1 && L.flick <= 0;
      L.level01 = on ? (dark >= 1 ? 0 : (L.flick > 0 ? 0.15 * this.rnd() : 1)) : 0;
    }
    for (const f of this.darknessFields) if (f.warn > 0) f.warn -= dt;
  };

  P.surfaceAt = function (e) {
    if (e.level !== 0) return HG.SURF_NAMES[this.world.surf[e.level][Math.floor(e.z) * W + Math.floor(e.x)]] || 'concrete';
    return HG.SURF_NAMES[this.world.surf[0][Math.floor(e.z) * W + Math.floor(e.x)]];
  };

  P.updateSurvivor = function (s, dt) {
    const c = s.ctrl;
    // while the host moves a remote player (hidden, seized, knocked down), their reported position is stale
    if (s.remote && (s.hidden || s.grabbedBy || (s.downT || 0) > 0)) s.netEpoch++;
    s.panicT = Math.max(0, s.panicT - dt); s.freezeT = Math.max(0, s.freezeT - dt); s.burstT = Math.max(0, s.burstT - dt);
    s.lightForcedOff = Math.max(0, s.lightForcedOff - dt); s.lightFlicker = Math.max(0, s.lightFlicker - dt);
    s.voiceCd = Math.max(0, s.voiceCd - dt);
    if (c.yaw !== null) s.yaw = c.yaw; if (c.pitch !== null) s.pitch = c.pitch;
    // flashlight
    if (c.toggleLight) { c.toggleLight = false; if (!s.hidden) { s.flashlightOn = !s.flashlightOn; this.emitSound('click', s.x, s.z, s.level, 3, s); } }
    if (c.reload) {
      c.reload = false;
      if (s.batteries > 0 && s.battery < 0.95) { s.batteries--; s.battery = 1; this.emitSound('reload', s.x, s.z, s.level, 3, s); this.emit({ type: 'reload', who: s.id }); }
    }
    if (c.medkit) { c.medkit = false; if (s.health === 1 && s.carry.includes('medkit') && !s.interact) s.interact = { kind: 'medkit', progress: 0, time: 4, x: s.x, z: s.z, label: 'Using first-aid kit' }; }
    if (this.flashlightActive(s)) {
      s.battery = Math.max(0, s.battery - dt / 260 * this.diff.battery);
      if (s.battery <= 0) { s.flashlightOn = false; this.emitSound('click', s.x, s.z, s.level, 2, s); this.emit({ type: 'batteryDead', who: s.id }); }
    }
    // seized or knocked flat: no control (struggling is handled by the creature's grip)
    s.downT = Math.max(0, (s.downT || 0) - dt);
    if (s.grabbedBy || s.downT > 0) {
      if (c.struggle) { c.struggle = false; this.struggle(s); }
      c.usePressed = false; s.interact = null; s.moving = false; s.speed = 0; s.vx = s.vz = 0;
      s.y = this.world.floorY(s.level, s.x, s.z);
      return;
    }
    // hiding
    if (s.hidden) {
      s.moving = false; s.vx = s.vz = 0;
      if (c.usePressed) { c.usePressed = false; this.exitHide(s); }
      return;
    }
    // interaction
    if (c.usePressed) {
      c.usePressed = false;
      const it = c.useTarget || this.focusFor(s);
      if (it) this.startInteract(s, it);
    }
    if (s.interact) {
      const ia = s.interact;
      const d = Math.hypot((ia.x || s.x) - s.x, (ia.z || s.z) - s.z);
      const valid = c.use && d < 2.4 && this.interactValid(s, ia);
      if (!valid) s.interact = null;
      else {
        let rate = 1;
        if (ia.kind === 'hold' || ia.kind === 'puzzle') {
          // cooperation: others working the same step speed it up
          const helpers = this.survivors.filter(o => o !== s && o.alive && o.interact && o.interact.step === ia.step && o.ctrl.use).length;
          rate = 1 + helpers * 0.6;
          if (ia.kind === 'puzzle' && s.isPlayer) rate = 0; // player solves the puzzle UI instead
          ia.step.progress += dt * rate / (this.survivors.filter(o => o.alive && o.interact && o.interact.step === ia.step && o.ctrl.use).length || 1);
          ia.progress = ia.step.progress;
          ia.time = ia.step.time;
          s.taskTime += dt;
          this.taskNoise(s, ia.step, dt);
          if (ia.step.progress >= ia.step.time) {
            ia.step.progress = ia.step.time;
            for (const o of this.survivors) if (o.interact && o.interact.step === ia.step) o.interact = null;
            this.emitSound('step_done', s.x, s.z, s.level, ia.step.noise || 8, s);
            this.advanceStep(ia.task, s);
          }
        } else {
          ia.progress += dt;
          if (ia.kind === 'search' && this.rnd() < dt * 2.2) this.emitSound('rummage', s.x, s.z, s.level, 7, s);
          if (ia.progress >= ia.time) { s.interact = null; this.completeInteract(s, ia); }
        }
      }
    }
    // movement: local players and bots integrate here; remote humans report their own position
    const moved = s.remote ? this.applyRemoteMove(s, dt) : this.moveSurvivor(s, dt);
    const surf = this.surfaceAt(s);
    const cover = s.level === 0 ? this.world.cover[Math.floor(s.z) * W + Math.floor(s.x)] : 0;
    // footsteps
    if (s.moving) {
      s.stepAcc += moved;
      const stride = s.sprinting ? 0.95 : (s.crouching ? 0.6 : 0.72);
      if (s.stepAcc > stride) {
        s.stepAcc = 0;
        let r = s.sprinting ? 17 : (s.crouching ? 1.6 : 6.5);
        if (surf === 'wood') r *= 1.3; else if (surf === 'gravel') r *= 1.35; else if (surf === 'grass') r *= 0.8; else if (surf === 'mud') r *= 1.0;
        if (cover === 1 || cover === 2) r *= 1.2;
        this.emitSound('step', s.x, s.z, s.level, r, s, { surface: surf, sprint: s.sprinting, crouch: s.crouching, who: 'survivor', foot: (s.foot = !s.foot) });
        if (surf === 'mud' && s.level === 0) this.emit({ type: 'footprint', x: s.x, z: s.z, yaw: Math.atan2(-s.vx, -s.vz), kind: 'boot', foot: s.foot });
      }
    }
    // escape
    if (s.level === 0 && s.z > 116.4 && this.gateState === 'open') this.escape(s);
  };
  // integrate one survivor's movement from its controls (shared by the simulation and online guests)
  P.moveSurvivor = function (s, dt) {
    const c = s.ctrl;
    let mx = c.mx, mz = c.mz;
    const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
    if (s.interact) { mx *= 0; mz *= 0; }
    if (s.freezeT > 0) { mx = 0; mz = 0; }
    const moving = Math.hypot(mx, mz) > 0.05;
    s.crouching = !!c.crouch && !c.sprint;
    let sp = s.crouching ? SURV.crouch : SURV.walk;
    s.sprinting = false;
    if (c.sprint && moving && s.stamina > 0.02 && !s.crouching) { sp = SURV.sprint; s.sprinting = true; s.stamina = Math.max(0, s.stamina - dt * SURV.staminaDrain); s.sprintRest = 0; }
    else if (c.sprint && moving && !s.crouching) { sp = SURV.jog; s.sprinting = true; s.sprintRest = 0; } // winded: a ragged jog
    else { s.sprintRest = (s.sprintRest || 0) + dt; if (s.sprintRest > 0.8) s.stamina = Math.min(1, s.stamina + dt * SURV.staminaRegen * (s.moving ? 0.7 : 1.3)); }
    if (s.burstT > 0) sp = Math.max(sp, 5.7);
    else if (s.health === 1) sp *= 0.93;
    if (s.panicT > 0 && s.isPlayer) sp *= 0.8;
    const surf = this.surfaceAt(s);
    const cover = s.level === 0 ? this.world.cover[Math.floor(s.z) * W + Math.floor(s.x)] : 0;
    if (cover === 2) sp *= 0.82; else if (cover === 1) sp *= 0.94;
    if (surf === 'mud') sp *= 0.93;
    const tx = mx * sp, tz = mz * sp;
    const k = Math.min(1, dt * 10);
    s.vx += (tx - s.vx) * k; s.vz += (tz - s.vz) * k;
    const ox = s.x, oz = s.z;
    s.x += s.vx * dt; s.z += s.vz * dt;
    s._hit = null;
    this.world.collide(s, null);
    this.stairLevel(s);
    const moved = Math.hypot(s.x - ox, s.z - oz);
    s.speed = moved / dt;
    s.moving = s.speed > 0.3;
    s.y = this.world.floorY(s.level, s.x, s.z);
    return moved;
  };
  // a remote human's position comes from their own computer; only sanity checks happen here
  P.applyRemoteMove = function (s, dt) {
    const n = s.net;
    s.stamina = n && n.st !== undefined ? n.st : s.stamina;
    if (!n || s.interact || s.freezeT > 0) { s.speed = 0; s.moving = false; s.vx = s.vz = 0; s.y = this.world.floorY(s.level, s.x, s.z); return 0; }
    const ox = s.x, oz = s.z, ol = s.level;
    let nx = n.x, nz = n.z;
    // never more than a sprint's worth per frame plus slack (protects against bad packets)
    const d = Math.hypot(nx - ox, nz - oz), lim = 9 * Math.max(dt, n.age || dt) + 0.6;
    if (d > lim && n.level === ol) { nx = ox + (nx - ox) / d * lim; nz = oz + (nz - oz) / d * lim; }
    s.x = nx; s.z = nz; s.level = n.level;
    this.world.collide(s, null);
    s.crouching = !!n.cr; s.sprinting = !!n.sp;
    const moved = s.level === ol ? Math.hypot(s.x - ox, s.z - oz) : 0;
    s.speed = n.spd !== undefined ? n.spd : moved / dt; s.moving = s.speed > 0.3;
    s.vx = (s.x - ox) / dt; s.vz = (s.z - oz) / dt;
    s.y = this.world.floorY(s.level, s.x, s.z);
    return moved;
  };
  P.stairLevel = function (e) {
    const w = this.world; const cx = Math.floor(e.x), cz = Math.floor(e.z);
    if (cx < 0 || cz < 0 || cx >= W || cz >= HG.H) return;
    const i = cz * W + cx;
    const sr = w.stairRef[i];
    if (sr >= 0) {
      const st = w.stairs[sr];
      if (e.level === st.A || e.level === st.B) {
        const owner = w.stairOwner[e.level][i];
        if (owner >= 0 && owner !== e.level) e.level = owner;
      }
    }
  };
  P.interactValid = function (s, ia) {
    switch (ia.kind) {
      case 'search': return !ia.ref.searched && !ia.ref.locked;
      case 'take': return ia.ref.items.length > 0;
      case 'pickup': return this.items.includes(ia.ref);
      case 'deliver': return !ia.task.done && ia.task.steps[ia.task.stepIdx] === ia.step && s.carry.includes(ia.item);
      case 'hold': case 'puzzle': return !ia.task.done && ia.task.steps[ia.task.stepIdx] === ia.step;
      case 'restart': return this.generatorFixed && !this.generatorRunning;
      case 'patch': return ia.ref.alive && ia.ref.health === 1 && Math.hypot(ia.ref.x - s.x, ia.ref.z - s.z) < 2;
      case 'medkit': return s.health === 1;
    }
    return true;
  };
  P.taskNoise = function (s, step, dt) {
    step._noiseT = (step._noiseT || 0) - dt;
    if (step._noiseT <= 0) {
      step._noiseT = 1.1;
      this.emitSound('task_' + (step.sound || 'work'), s.x, s.z, s.level, step.noise || 8, s, { task: true });
    }
  };

  P.escape = function (s) {
    s.escaped = true; s.escapedAt = this.time; s.interact = null;
    this.emit({ type: 'escaped', who: s.id, name: s.name });
    if (s.ai) this.say(s, ['I made it! Come on!', "I'm out! Hurry!", "I'm on the road! Move!"][Math.floor(this.rnd() * 3)], { shout: true });
  };

  P.updateTasks = function (dt) {
    // zone steps progress automatically while survivors stand inside
    for (const t of this.tasks) {
      if (t.done) continue;
      const st = t.steps[t.stepIdx];
      if (st.kind !== 'zone') continue;
      const z = this.world.stations[st.station];
      const inside = this.survivors.filter(s => s.alive && !s.escaped && !s.hidden && s.level === z.level && Math.hypot(s.x - z.x, s.z - z.z) < z.r).length;
      st.occupants = inside;
      if (inside > 0) {
        st.progress += dt * Math.min(1.6, 1 + (inside - 1) * 0.3);
        st._noiseT = (st._noiseT || 0) - dt;
        if (st._noiseT <= 0) { st._noiseT = 3.2; this.emitSound('task_beacon', z.x, z.z - 3, 0, st.noise, null, { task: true }); }
        if (st.progress >= st.time) this.advanceStep(t, null);
      }
    }
    // a running generator hums (attracts the monster)
    if (this.generatorRunning) {
      this._genT = (this._genT || 0) - dt;
      if (this._genT <= 0) { this._genT = 2.5; this.emitSound('generator', 60.1, 47, 0, 24, null, { ambient: true }); }
    }
    // loose items
  };

  P.updateGate = function (dt) {
    if (this.gateState === 'opening') {
      this.gateTimer -= dt;
      this._gateNoise = (this._gateNoise || 0) - dt;
      if (this._gateNoise <= 0) { this._gateNoise = 1.5; this.emitSound('gate_alarm', 64, 114, 0, 55, null); }
      if (this.gateTimer <= 0) {
        this.gateState = 'open';
        for (const b of this.world.gateBoxes) b.enabled = false;
        for (let x = 62; x <= 65; x++) this.world.set(0, x, 114, T.OPEN);
        this.world.markDirty();
        this.emit({ type: 'gateOpen' });
        this.emitSound('gate_open', 64, 114, 0, 50, null);
      }
    }
  };

  // ---------- monster ----------
  P.updateMonster = function (m, dt) {
    const c = m.ctrl, A = HG.ABILITIES, cdm = this.diff.abilityCd;
    for (const k in m.cd) m.cd[k] = Math.max(0, m.cd[k] - dt);
    m.attackCd = Math.max(0, m.attackCd - dt);
    m.recoverT = Math.max(0, m.recoverT - dt);
    m.revealT = Math.max(0, m.revealT - dt);
    m.lunge = Math.max(0, m.lunge - dt);
    if (c.yaw !== null && m.dashT <= 0) m.yaw = c.yaw; if (c.pitch !== null) m.pitch = c.pitch;
    m.stumbleT = Math.max(0, m.stumbleT - dt);
    const busy = m.recoverT > 0 || m.screamWind > 0 || m.doorT > 0 || m.stumbleT > 0 || m.pounceWind > 0 || m.pounceT > 0 || !!m.grabbed;
    // --- abilities ---
    if (c.stalk !== null) { m.stalking = c.stalk; c.stalk = null; }
    if (c.crawl !== null) {
      const want = c.crawl; c.crawl = null;
      if (want !== m.crawling && m.cd.crawl <= 0 && m.ghostT <= 0 && m.dashT <= 0) {
        if (!want && this.crawlBlocked(m)) { /* cannot stand up here */ }
        else { m.crawling = want; m.cd.crawl = A.crawl.cooldown; m.radius = want ? MON.crawlRadius : MON.radius; this.emitSound(want ? 'crawl_down' : 'crawl_up', m.x, m.z, m.level, 4, m); this.useAbility('crawl'); }
      }
    }
    if (c.dash) {
      c.dash = false;
      if (m.cd.dash <= 0 && !busy && m.ghostT <= 0 && !m.crawling) {
        m.dashT = A.dash.duration; m.cd.dash = A.dash.cooldown * cdm;
        m.dashDir = { x: -Math.sin(m.yaw), z: -Math.cos(m.yaw) };
        this.emitSound('dash', m.x, m.z, m.level, A.dash.sound, m);
        this.useAbility('dash');
      }
    }
    if (c.ghost) {
      c.ghost = false;
      if (m.cd.ghost <= 0 && m.ghostT <= 0 && !busy) {
        if (m.crawling && !this.crawlBlocked(m)) { m.crawling = false; m.radius = MON.radius; }
        if (!m.crawling) {
          m.ghostT = A.ghost.duration; m.cd.ghost = A.ghost.cooldown * cdm; m.ghostWarn = A.ghost.warn;
          this.emitSound('ghost_on', m.x, m.z, m.level, 16, m);
          this.useAbility('ghost');
        }
      }
    }
    if (c.scream) {
      c.scream = false;
      if (m.cd.scream <= 0 && !busy && m.ghostT <= 0) {
        m.screamWind = A.scream.windup; m.cd.scream = A.scream.cooldown * cdm;
        this.emitSound('scream_wind', m.x, m.z, m.level, 12, m);
        this.useAbility('scream');
      }
    }
    if (c.darkness) {
      c.darkness = false;
      if (m.cd.darkness <= 0 && !busy) {
        m.cd.darkness = A.darkness.cooldown * cdm;
        this.darknessFields.push({ x: m.x, z: m.z, level: m.level, r: A.darkness.range, t: A.darkness.duration + A.darkness.warn, warn: A.darkness.warn });
        for (const s of this.survivors) if (s.alive && s.level === m.level && Math.hypot(s.x - m.x, s.z - m.z) < A.darkness.range) {
          s.lightFlicker = A.darkness.warn; s.lightForcedOff = A.darkness.warn + A.darkness.duration * (0.7 + this.rnd() * 0.3);
          s.fear = clamp(s.fear + 0.14 * (1.2 - s.bravery), 0, 1);
          if (s.ai) s.ai.onDarkness(m);
        }
        this.emitSound('darkness', m.x, m.z, m.level, A.darkness.sound, m);
        this.emit({ type: 'darkness', x: m.x, z: m.z, level: m.level, r: A.darkness.range });
        this.useAbility('darkness');
      }
    }
    if (m.screamWind > 0) {
      m.screamWind -= dt;
      if (m.screamWind <= 0) {
        this.emitSound('scream', m.x, m.z, m.level, A.scream.sound, m);
        this.emit({ type: 'scream', x: m.x, z: m.z, level: m.level });
        for (const s of this.survivors) if (s.alive && !s.escaped) {
          const aud = this.audibility({ x: m.x, z: m.z, level: m.level, radius: A.scream.range * 1.6 }, s.x, s.z, s.level);
          if (aud > 0.35) {
            s.panicT = A.scream.panic * (0.7 + aud * 0.5); s.fear = clamp(s.fear + 0.32 * aud * (1.3 - s.bravery * 0.6), 0, 1);
            if (s.ai) s.ai.onScream(m, aud);
          }
        }
      }
    }
    if (m.ghostT > 0) {
      m.ghostT -= dt; m.ghostWarn = Math.max(0, m.ghostWarn - dt);
      if (m.ghostT <= 0) {
        // materialise; if inside something, push out
        m.ghostT = 0; this.emitSound('ghost_off', m.x, m.z, m.level, 14, m);
        const g = this.world.grid[m.level][Math.floor(m.z) * W + Math.floor(m.x)];
        if (g === T.VEIL) { m.ghostT = 0.3; }
      }
    }
    // run
    m.running = false;
    if (c.run && !m.crawling && m.ghostT <= 0 && (m.runEnergy > A.run.minStart || m.wasRunning) && m.runEnergy > 0) { m.running = true; }
    m.wasRunning = m.running;
    if (m.running) m.runEnergy = Math.max(0, m.runEnergy - dt * A.run.drain);
    else m.runEnergy = Math.min(1, m.runEnergy + dt * A.run.regen);
    // attack
    if (c.attack) {
      c.attack = false;
      if (m.attackCd <= 0 && m.attackWind <= 0 && !busy && m.ghostT <= 0) {
        if (m.crawling) { if (!this.crawlBlocked(m)) { m.crawling = false; m.radius = MON.radius; m.attackWind = MON.windup + 0.25; } }
        else m.attackWind = m.dashT > 0 || m.lunge > 0 ? 0.06 : MON.windup;
        if (m.attackWind > 0) this.emitSound('attack_wind', m.x, m.z, m.level, 9, m);
      }
    }
    if (m.attackWind > 0) {
      m.attackWind -= dt;
      if (m.attackWind <= 0) this.resolveAttack(m);
    }
    this.updatePounceGrab(m, c, dt, busy);
    // hide-spot search (monster opens a closet)
    if (m.searchHide) {
      m.searchHideT -= dt;
      if (m.searchHideT <= 0) {
        const h = m.searchHide; m.searchHide = null; h.lastOpened = this.time;
        this.emitSound('closet_open', h.x, h.z, h.level, 9, m);
        if (h.occupant) { const v = h.occupant; this.exitHide(v); this.emitSound('closet_rip', h.x, h.z, h.level, 30, m); this.startGrab(m, v, true); }
      }
    }
    // doors (monster takes a moment to open; running → slams through)
    if (m.doorT > 0) {
      m.doorT -= dt;
      if (m.doorT <= 0 && m.doorTarget) { if (!m.doorTarget.open) this.toggleDoor(m, m.doorTarget, true); m.doorTarget = null; }
    }
    if (c.usePressed) {
      c.usePressed = false;
      const d = this.doorNear(m, 1.7);
      if (d && !d.locked && m.ghostT <= 0 && m.doorT <= 0) {
        if (d.open) this.toggleDoor(m, d);
        else if (m.running || m.dashT > 0) this.toggleDoor(m, d, true);
        else { m.doorT = 0.45; m.doorTarget = d; }
      } else {
        // check a hiding spot
        const h = this.world.hides.find(h => h.level === m.level && Math.hypot(h.ix - m.x, h.iz - m.z) < 1.3);
        if (h && !m.searchHide && m.ghostT <= 0) { m.searchHide = h; m.searchHideT = 0.9; this.emitSound('closet_rattle', h.x, h.z, h.level, 7, m); }
      }
    }
    // --- movement ---
    let mx = c.mx, mz = c.mz; const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
    let sp = MON.walk;
    let mode = 'walk';
    if (m.crawling) { sp = A.crawl.speed; mode = 'crawl'; }
    else if (m.ghostT > 0) { sp = A.ghost.speed; mode = 'ghost'; }
    else if (m.running) { sp = A.run.speed; mode = 'run'; }
    else if (m.stalking) { sp = A.stalk.speed; mode = 'stalk'; }
    sp *= this.diff.monSpeed;
    if (m.attackWind > 0) sp *= 0.85;
    if (busy) sp = m.grabbed ? HG.ATTACKS.grab.dragSpeed : 0;
    if (this.phase === 1 && !m.isPlayer) sp *= 0.85;
    m.mode = mode;
    let tx = mx * sp, tz = mz * sp;
    if (m.dashT > 0) {
      m.dashT -= dt; tx = m.dashDir.x * A.dash.speed; tz = m.dashDir.z * A.dash.speed; mode = m.mode = 'dash';
      if (m.dashT <= 0) m.lunge = 0.5;
    }
    if (m.pounceT > 0) { tx = m.pounceDir.x * HG.ATTACKS.pounce.speed; tz = m.pounceDir.z * HG.ATTACKS.pounce.speed; mode = m.mode = 'pounce'; }
    else if (m.pounceWind > 0) mode = m.mode = 'coil';
    else if (m.grabbed) mode = m.mode = 'grab';
    else if (m.stumbleT > 0) mode = m.mode = 'stumble';
    const k = Math.min(1, dt * (m.dashT > 0 || m.pounceT > 0 ? 30 : 7));
    m.vx += (tx - m.vx) * k; m.vz += (tz - m.vz) * k;
    const ox = m.x, oz = m.z;
    m.x += m.vx * dt; m.z += m.vz * dt;
    m._hit = null;
    this.world.collide(m, { crawl: m.crawling, ghost: m.ghostT > 0 });
    if (m.dashT > 0 && m._hit) { m.dashT = 0; m.lunge = 0.35; this.emitSound('impact', m.x, m.z, m.level, 14, m); }
    if (m.pounceT > 0 && m._hit) { m.pounceT = 0; this.pounceLand(m, true); }
    this.stairLevel(m);
    const moved = Math.hypot(m.x - ox, m.z - oz);
    m.speed = moved / dt; m.moving = m.speed > 0.25;
    m.y = this.world.floorY(m.level, m.x, m.z);
    // auto-attack during dash contact (AI and player)
    if ((m.dashT > 0 || m.lunge > 0) && m.attackWind <= 0 && m.attackCd <= 0 && m.ghostT <= 0) {
      for (const s of this.survivors) if (s.alive && !s.escaped && !s.hidden && s.level === m.level && Math.hypot(s.x - m.x, s.z - m.z) < 1.35) { this.resolveAttack(m); break; }
    }
    // footsteps
    if (m.moving) {
      m.stepAcc += moved;
      const stride = mode === 'run' || mode === 'dash' ? 1.5 : mode === 'crawl' ? 0.55 : 1.05;
      if (m.stepAcc > stride) {
        m.stepAcc = 0;
        const surf = this.surfaceAt(m);
        let r = mode === 'run' ? A.run.sound : mode === 'dash' ? 26 : mode === 'crawl' ? A.crawl.sound : mode === 'ghost' ? A.ghost.sound : mode === 'stalk' ? A.stalk.sound : 7.5;
        if (surf === 'wood' && mode !== 'ghost') r *= 1.35;
        this.emitSound('mstep', m.x, m.z, m.level, r, m, { surface: surf, mode, who: 'monster', foot: (m.foot = !m.foot) });
        if (surf === 'mud' && m.level === 0 && mode !== 'ghost') this.emit({ type: 'footprint', x: m.x, z: m.z, yaw: Math.atan2(-m.vx, -m.vz), kind: mode === 'crawl' ? 'hand' : 'claw', foot: m.foot });
      }
    }
    // tell the AI about doors in the way
    if (!m.isPlayer && m._hit && m._hit.door && !m._hit.door.open && m.ghostT <= 0 && m.doorT <= 0 && !m._hit.door.locked) {
      if (m.running) this.toggleDoor(m, m._hit.door, true); else { m.doorT = 0.45; m.doorTarget = m._hit.door; }
    }
  };
  P.crawlBlocked = function (m) {
    const g = this.world.grid[m.level][Math.floor(m.z) * W + Math.floor(m.x)];
    return g === T.CRAWL;
  };
  P.useAbility = function (k) { this.stats.abilityUses[k] = (this.stats.abilityUses[k] || 0) + 1; this.emit({ type: 'ability', ability: k }); };

  // ---------- pounce & grab ----------
  P.updatePounceGrab = function (m, c, dt, busy) {
    const AT = HG.ATTACKS, cdm = this.diff.abilityCd;
    if (c.pounce) {
      c.pounce = false;
      if (m.cd.pounce <= 0 && !busy && m.ghostT <= 0 && m.attackWind <= 0 && m.dashT <= 0) {
        m.pounceWind = AT.pounce.windup; m.cd.pounce = AT.pounce.cooldown * cdm; m.lastAttack = 'pounce';
        this.emitSound('pounce_wind', m.x, m.z, m.level, 16, m);
        this.useAbility('pounce');
      }
    }
    if (c.grab) {
      c.grab = false;
      if (m.cd.grab <= 0 && !busy && m.ghostT <= 0 && m.attackWind <= 0) {
        if (m.crawling && !this.crawlBlocked(m)) { m.crawling = false; m.radius = MON.radius; }
        m.grabWind = AT.grab.windup; m.lastAttack = 'grab';
        this.emitSound('attack_wind', m.x, m.z, m.level, 9, m);
      }
    }
    if (m.pounceWind > 0) {
      m.pounceWind -= dt;
      if (m.pounceWind <= 0) {
        if (m.crawling && !this.crawlBlocked(m)) { m.crawling = false; m.radius = MON.radius; }
        m.pounceT = AT.pounce.air; m.pounceDir = { x: -Math.sin(m.yaw), z: -Math.cos(m.yaw) };
        this.emitSound('pounce_leap', m.x, m.z, m.level, AT.pounce.sound, m);
      }
    }
    if (m.pounceT > 0) {
      m.pounceT -= dt;
      m.airY = Math.sin(Math.PI * clamp(1 - m.pounceT / AT.pounce.air, 0, 1)) * 1.0;
      for (const s of this.survivors) if (s.alive && !s.escaped && !s.hidden && s.level === m.level && !s.grabbedBy && Math.hypot(s.x - m.x, s.z - m.z) < 1.4) {
        m.pounceT = 0; m.airY = 0;
        this.emitSound('pounce_hit', s.x, s.z, s.level, 34, s);
        s.downT = AT.pounce.knockdown; s.interact = null;
        m.lastAttack = 'pounce';
        this.hitSurvivor(m, s, false);
        if (s.alive) m.recoverT = Math.max(m.recoverT, 2.4);
        break;
      }
      if (m.pounceT <= 0 && m.airY > 0) this.pounceLand(m, false);
    }
    if (m.grabWind > 0) {
      m.grabWind -= dt;
      if (m.grabWind <= 0) {
        let best = null, bd = 99;
        const fx = -Math.sin(m.yaw), fz = -Math.cos(m.yaw);
        for (const s of this.survivors) {
          if (!s.alive || s.escaped || s.hidden || s.level !== m.level || s.grabbedBy) continue;
          const dx = s.x - m.x, dz = s.z - m.z, d = Math.hypot(dx, dz);
          if (d < AT.grab.range && ((dx * fx + dz * fz) / (d || 1) > 0.3 || d < 0.8) && d < bd && this.world.los(m.level, m.x, m.z, s.x, s.z).clear) { best = s; bd = d; }
        }
        if (best) this.startGrab(m, best, false);
        else { m.attackCd = AT.grab.missCd; m.cd.grab = 3; this.emitSound('swing_miss', m.x, m.z, m.level, 8, m); this.emit({ type: 'attackMiss' }); }
      }
    }
    if (m.grabbed) {
      const v = m.grabbed;
      if (!v.alive || v.escaped) { m.grabbed = null; return; }
      m.grabT -= dt;
      // hold the victim in front of the claws
      const fx = -Math.sin(m.yaw), fz = -Math.cos(m.yaw);
      v.x = m.x + fx * 0.75; v.z = m.z + fz * 0.75; v.level = m.level; v.y = this.world.floorY(v.level, v.x, v.z);
      this.world.collide(v, null);
      v.yaw = Math.atan2(-(m.x - v.x), -(m.z - v.z));
      v.interact = null;
      // struggling: the player mashes, bots fight by temperament, nearby teammates pull
      let rate = 0;
      if (!v.isPlayer) rate += (0.17 + v.bravery * 0.24) * (0.6 + this.rnd() * 0.8);
      for (const o of this.survivors) if (o !== v && o.alive && !o.escaped && !o.hidden && o.level === v.level && Math.hypot(o.x - v.x, o.z - v.z) < 4.5) rate += 0.35;
      v.struggle = clamp((v.struggle || 0) + rate * dt * (this.diff.hits > 1 ? 1 : 0.75), 0, 1);
      v.fear = 1;
      v.ctrl.struggle = false;
      m._groanT = (m._groanT || 0) - dt;
      if (m._groanT <= 0) { m._groanT = 0.9 + this.rnd() * 0.5; this.emitSound('struggle', v.x, v.z, v.level, 26, v); }
      if (v.struggle >= 1) {
        // broke free: wounded, but alive, and the creature reels
        m.grabbed = null; v.grabbedBy = null; v.struggle = 0;
        m.stumbleT = 2.8; m.cd.grab = HG.ATTACKS.grab.cooldown * cdm; m.attackCd = 3;
        if (v.health === 2) v.health = 1;
        v.burstT = 3.2; v.bleedT = this.time;
        this.emitSound('grab_break', v.x, v.z, v.level, 30, m);
        this.emit({ type: 'grabBreak', who: v.id, name: v.name });
        if (m.ai) m.ai.onBreak(v);
        if (v.ai) v.ai.onHit(m);
      } else if (m.grabT <= 0) {
        m.grabbed = null; v.grabbedBy = null;
        m.cd.grab = HG.ATTACKS.grab.cooldown * cdm;
        this.catchSurvivor(m, v, 'grab');
      }
    }
  };
  P.pounceLand = function (m, wall) {
    m.airY = 0; m.pounceT = 0;
    m.stumbleT = HG.ATTACKS.pounce.stumble * (wall ? 1.2 : 1);
    this.emitSound('pounce_land', m.x, m.z, m.level, 20, m);
    this.emit({ type: 'attackMiss', kind: 'pounce' });
  };
  P.startGrab = function (m, v, fromHide) {
    const AT = HG.ATTACKS;
    m.grabbed = v; v.grabbedBy = m; v.struggle = 0; v.interact = null; v.downT = 0;
    m.grabT = AT.grab.hold * (this.diff.hits > 1 ? 1 : 0.8) * (fromHide ? 0.8 : 1);
    m.lastAttack = 'grab'; m.attackCd = 1;
    this.stats.grabs = (this.stats.grabs || 0) + 1;
    this.useAbility('grab');
    this.emitSound('grab', v.x, v.z, v.level, AT.grab.sound, v);
    this.emit({ type: 'grabbed', who: v.id, name: v.name, x: v.x, z: v.z, level: v.level });
    if (v.ai) v.ai.onHit(m);
    for (const o of this.survivors) if (o.ai && o !== v && o.alive) o.ai.onTeammateGrabbed && o.ai.onTeammateGrabbed(v);
  };
  // the player mashes the struggle key
  P.struggle = function (s) { if (s.grabbedBy) s.struggle = clamp((s.struggle || 0) + (this.diff.hits > 1 ? 0.075 : 0.055), 0, 1); };

  P.resolveAttack = function (m) {
    let best = null, bd = 99;
    const fx = -Math.sin(m.yaw), fz = -Math.cos(m.yaw);
    for (const s of this.survivors) {
      if (!s.alive || s.escaped || s.hidden || s.level !== m.level) continue;
      const dx = s.x - m.x, dz = s.z - m.z, d = Math.hypot(dx, dz);
      const cos = (dx * fx + dz * fz) / (d || 1);
      if (d < MON.attackRange + (m.lunge > 0 ? 0.3 : 0) && (cos > 0.35 || d < 0.9) && d < bd) {
        if (this.world.los(m.level, m.x, m.z, s.x, s.z).clear) { best = s; bd = d; }
      }
    }
    m.lunge = 0; m.dashT = 0;
    if (best) { m.lastAttack = 'swipe'; this.hitSurvivor(m, best, false); }
    else { m.attackCd = MON.missCd; this.emitSound('swing_miss', m.x, m.z, m.level, 8, m); this.emit({ type: 'attackMiss' }); }
  };
  P.hitSurvivor = function (m, s, fromHide) {
    this.stats.hits++;
    m.attackCd = MON.hitCd; m.recoverT = 1.9;
    const lethal = s.health <= 1 || this.diff.hits <= 1;
    s.interact = null;
    if (!lethal) {
      s.health = 1; s.burstT = 2.4; s.bleedT = this.time;
      s.fear = clamp(s.fear + 0.35, 0, 1);
      this.emitSound('hit', s.x, s.z, s.level, 30, s, { attack: m.lastAttack });
      this.emit({ type: 'hit', who: s.id, name: s.name, attack: m.lastAttack });
      if (s.ai) s.ai.onHit(m);
      if (m.ai) m.ai.onHit(s);
    } else this.catchSurvivor(m, s);
  };
  P.catchSurvivor = function (m, s, how) {
    how = how || m.lastAttack || 'swipe';
    if (s.grabbedBy) { s.grabbedBy.grabbed = null; s.grabbedBy = null; }
    s.alive = false; s.deathHow = how; s.caught = true; s.caughtAt = this.time; s.interact = null; s.flashlightOn = false;
    s.deathX = s.x; s.deathZ = s.z; s.deathLevel = s.level;
    if (s.hidden) { s.hidden.occupant = null; s.hidden = null; }
    m.catches++; m.recoverT = 3.2; m.attackCd = 3;
    // drop carried items
    for (const it of s.carry) this.dropItem(it, s.x + (this.rnd() - 0.5) * 0.8, s.z + (this.rnd() - 0.5) * 0.8, s.level);
    s.carry = [];
    this.emitSound('death_scream', s.x, s.z, s.level, 70, s, { how });
    this.emit({ type: 'caught', who: s.id, name: s.name, x: s.x, z: s.z, level: s.level, how });
    if (m.ai) m.ai.onCatch(s);
    for (const o of this.survivors) if (o.ai && o.alive) o.ai.onTeammateCaught(s);
  };
  P.dropItem = function (kind, x, z, level) {
    const it = { id: (this._itemId = (this._itemId || 0) + 1), kind, x, z, level };
    this.items.push(it);
    return it;
  };

  // ---------- fear ----------
  P.updateFear = function (dt) {
    const m = this.monster;
    for (const s of this.survivors) {
      if (!s.alive || s.escaped) continue;
      const brave = 1.25 - s.bravery * 0.6;
      let df = 0;
      const d = s.level === m.level ? Math.hypot(m.x - s.x, m.z - s.z) : 99;
      // supernatural dread when it is close, even unseen
      if (d < 14) df += (1 - d / 14) * 0.05 * (m.stalking ? 1.6 : 1);
      if (!this.flashlightActive(s) && !this.lampLit(s.x, s.z, s.level)) df += 0.008;
      let nearMates = 0;
      for (const o of this.survivors) if (o !== s && o.alive && !o.escaped && o.level === s.level && Math.hypot(o.x - s.x, o.z - s.z) < 9) nearMates++;
      if (nearMates === 0) df += 0.009; else df -= 0.012 * Math.min(nearMates, 3);
      if (s.level === 0 && this.world.isHouse(0, s.x, s.z) && this.houseCircuit()) df -= 0.01;
      if (d > 30) df -= 0.012;
      if (s.seesMonster) df += 0.12;
      s.fear = clamp(s.fear + df * dt * (df > 0 ? brave : 1), 0.02, 1);
    }
  };

  // ---------- end ----------
  P.checkEnd = function () {
    const alive = this.survivors.filter(s => s.alive && !s.escaped);
    const timeout = this.time >= this.timeLimit;
    if (alive.length === 0 || timeout) {
      if (timeout) for (const s of alive) { s.alive = false; s.caught = true; s.caughtAt = this.time; s.lostToNight = true; }
      this.over = true;
      const escaped = this.survivors.filter(s => s.escaped).length;
      const caught = this.survivors.filter(s => s.caught).length;
      let win;
      if (this.mode === 'survivor') win = this.survivors[0].escaped;
      else win = escaped < Math.ceil(this.survivors.length / 2);
      this.result = { win, escaped, caught, timeout, time: this.time, tasksDone: this.tasks.filter(t => t.done).length, tasksTotal: this.tasks.length, playerEscaped: this.mode === 'survivor' ? this.survivors[0].escaped : null };
      this.emit({ type: 'matchOver', result: this.result });
    }
  };

  P.clock = function () {
    // in-world night clock: 1:12 AM → 5:00 AM across the time limit
    const mins = 72 + (this.time / this.timeLimit) * 228;
    const h = Math.floor(mins / 60), mm = Math.floor(mins % 60);
    return `${h}:${String(mm).padStart(2, '0')} AM`;
  };
})(typeof window !== 'undefined' ? window : globalThis);
