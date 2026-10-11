// =============================================================
//  PULSE//SHIFT — CENTRAL CONFIGURATION
//  Tweak numbers here to change how the game feels.
//  Everything else in the game reads from this file.
// =============================================================
window.PS = window.PS || {};

PS.CONFIG = {
  // Logical game resolution (the canvas is scaled to fit the window).
  width: 1280,
  height: 720,
  arenaPad: 26, // empty border around the playable arena

  // ---------------- PLAYER MOVEMENT ----------------
  player: {
    hitRadius: 6,          // collision radius (smaller than the drawing = fair)
    size: 12,              // visual size
    moveSpeed: 330,        // pixels per second
    accel: 5200,           // how fast you reach full speed (higher = snappier)
    decel: 7000,           // how fast you stop

    dashSpeed: 1450,       // speed during a dash
    dashTime: 0.12,        // seconds a dash lasts
    dashCooldown: 0.30,    // seconds before you can dash again
    dashIFrameExtra: 0.08, // extra invulnerability after the dash ends
    perfectWindow: 0.08,   // touch a pink hazard within this many seconds of starting a dash = PERFECT SHIFT

    hopTime: 0.36,         // seconds airborne during a Pulse Hop
    hopCooldown: 0.42,
    perfectHopWindow: 0.18, // cross a violet floor wave this early in the hop = PERFECT HOP
    hopSpeedMult: 1.1,

    hurtIFrames: 1.4,      // invulnerability after getting hit
    overdriveTime: 1.6,    // speed boost after a Perfect Shift
    overdriveSpeedMult: 1.3,
    inputBuffer: 0.12      // a button pressed slightly early still counts
  },

  // ---------------- RESONANCE / BREAK ----------------
  resonance: {
    max: 100,
    breakCost: 50,
    perfectShift: 22,
    perfectHop: 16,
    graze: 4,
    core: 12,
    breakRadius: 250,
    breakIFrames: 0.25
  },

  // Perfect Shift time dilation
  perfect: { slowScale: 0.22, slowTime: 0.28 },

  // Damage dealt to bosses (boss HP is 100)
  bossDamage: { reflected: 1.6, perfectEcho: 0.6, core: 2.2 },

  // Combo multiplier: +0.5x every 5 combo, up to 4x
  combo: { perStep: 5, multPerStep: 0.5, maxMult: 4 },

  // Beat Cores: glowing pickups that strike the boss
  cores: { everyBars: 4, lifeBars: 3, radius: 14 },

  // ---------------- DIFFICULTY ----------------
  // speed   = projectile speed multiplier
  // density = projectile count multiplier
  // iframes = how long you stay invulnerable after a hit (multiplier)
  // Telegraph timings never change: they always stay locked to the beat.
  difficulty: {
    easy:   { label: 'Easy',   playerHp: 9, speed: 0.7,  density: 0.55, bossDamageTaken: 1.6, scoreMult: 0.7, laserWidth: 0.7, iframes: 1.5 },
    normal: { label: 'Normal', playerHp: 5, speed: 1.0,  density: 1.0,  bossDamageTaken: 1.0, scoreMult: 1.0, laserWidth: 1.0, iframes: 1 },
    hard:   { label: 'Hard',   playerHp: 4, speed: 1.15, density: 1.25, bossDamageTaken: 0.9, scoreMult: 1.35, laserWidth: 1.1, iframes: 1 }
  },

  // Boss modifiers (toggle in the setup menu)
  modifiers: {
    doubleTime: { label: 'Double Time', desc: '+15% tempo. Everything moves faster.', scoreMult: 1.25 },
    glass:      { label: 'Glass Core',  desc: '1 HP. Bosses take 50% more damage.',   scoreMult: 1.4 },
    remix:      { label: 'Remix',       desc: 'Harder, denser pattern variants.',      scoreMult: 1.3 }
  },

  bossOrder: ['metronome', 'seraph', 'offbeat'],

  // Hazard colours are shared by every palette so the rules stay readable:
  //   PINK   = dash through it (air)
  //   VIOLET = hop over it (floor)
  //   CYAN hollow diamond = breakable, can be sent back with BREAK
  hazardColors: {
    danger: '#ff2e7e',
    dangerCore: '#ffd6e6',
    ground: '#a855ff',
    breakable: '#8afcff',
    friendly: '#7dffb0'
  },

  // ---------------- COLOUR PALETTES ----------------
  palettes: {
    neon:        { name: 'Neon Pulse',  bg: '#07060f', bg2: '#140a2a', grid: '#2b2160', player: '#5ff7ff', trail: '#5ff7ff', boss: '#ff4fd8', boss2: '#8a5cff', accent: '#ff4fd8', ui: '#ece8ff',
                   unlock: null },
    ember:       { name: 'Ember',       bg: '#0c0605', bg2: '#22100a', grid: '#4a2214', player: '#ffd166', trail: '#ffb347', boss: '#ff6b35', boss2: '#ffcf56', accent: '#ffb347', ui: '#fff1e0',
                   unlock: { id: 'clearAny', text: 'Defeat any boss' } },
    ultraviolet: { name: 'Ultraviolet', bg: '#05030f', bg2: '#100636', grid: '#30207a', player: '#ffffff', trail: '#b9a6ff', boss: '#9d7bff', boss2: '#5ee6ff', accent: '#c4b0ff', ui: '#f0ebff',
                   unlock: { id: 'rankA', text: 'Rank A or better on any boss' } },
    monolith:    { name: 'Monolith',    bg: '#050505', bg2: '#141414', grid: '#2e2e2e', player: '#ffffff', trail: '#dddddd', boss: '#e8e8e8', boss2: '#8a8a8a', accent: '#ffffff', ui: '#f5f5f5',
                   unlock: { id: 'clearHard', text: 'Defeat any boss on Hard' } },
    toxic:       { name: 'Toxic',       bg: '#030a06', bg2: '#08200f', grid: '#14502a', player: '#b6ff3b', trail: '#7dff6a', boss: '#2dffc4', boss2: '#d5ff4f', accent: '#b6ff3b', ui: '#eaffea',
                   unlock: { id: 'survive120', text: 'Survive 2:00 in Survival' } },
    sunset:      { name: 'Sunset',      bg: '#0b0410', bg2: '#260a2a', grid: '#55204f', player: '#ffe066', trail: '#ff9e7a', boss: '#5ad1ff', boss2: '#ff7ac6', accent: '#ffe066', ui: '#fff0f6',
                   unlock: { id: 'clearRush', text: 'Clear Boss Rush' } }
  },

  // ---------------- DASH TRAILS ----------------
  trails: {
    ribbon: { name: 'Ribbon', unlock: null },
    pixel:  { name: 'Pixel',  unlock: { id: 'tutorial',   text: 'Finish the tutorial' } },
    shards: { name: 'Shards', unlock: { id: 'perfects30', text: '30 lifetime Perfect Shifts' } },
    comet:  { name: 'Comet',  unlock: { id: 'rankS',      text: 'Rank S on any boss' } },
    helix:  { name: 'Helix',  unlock: { id: 'rankSPlus',  text: 'Rank S+ on any boss' } }
  }
};
