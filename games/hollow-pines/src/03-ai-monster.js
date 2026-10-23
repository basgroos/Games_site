/* Hollow Pines — monster AI. Perceives only through sight, hearing and memory. */
(function (G) {
  'use strict';
  const HG = G.HG;
  const { clamp } = HG.util;
  const T = HG.T, W = HG.W;
  const angTo = (ax, az, bx, bz) => Math.atan2(-(bx - ax), -(bz - az)); // yaw facing from a to b
  const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
  HG.angTo = angTo; HG.angDiff = angDiff;

  // shared steering / path following used by both AIs
  function Nav(sim, ent, caps) {
    this.sim = sim; this.ent = ent; this.caps = caps;
    this.path = null; this.idx = 0; this.goal = null; this.repathT = 0;
    this.lastPos = { x: ent.x, z: ent.z }; this.stuckT = 0; this.stuckCount = 0; this.failed = false;
    this.penalty = new Map();
  }
  HG.Nav = Nav;
  Nav.prototype.setGoal = function (g, costFn, force) {
    if (!g) { this.goal = null; this.path = null; return false; }
    if (!force && this.goal && this.path && this.goal.level === g.level && Math.hypot(this.goal.x - g.x, this.goal.z - g.z) < 1.2) { this.goal = g; return true; }
    this.goal = g; this.costFn = costFn;
    return this.repath();
  };
  Nav.prototype.repath = function () {
    const e = this.ent, g = this.goal;
    if (!g) return false;
    const pen = this.penalty, base = this.costFn;
    const cf = (l, i, x, z) => (pen.get(l * 100000 + i) || 0) + (base ? base(l, i, x, z) : 0);
    this.path = this.sim.world.findPath({ level: e.level, x: e.x, z: e.z, radius: e.radius }, g, typeof this.caps === 'function' ? this.caps() : this.caps, cf, 40000);
    this.idx = 1; this.repathT = 0;
    this.failed = !this.path;
    return !!this.path;
  };
  Nav.prototype.arrived = function (r) {
    const e = this.ent, g = this.goal; if (!g) return true;
    return e.level === g.level && Math.hypot(e.x - g.x, e.z - g.z) < (r || 0.7);
  };
  Nav.prototype.remaining = function () {
    if (!this.path) return 99;
    let d = 0, px = this.ent.x, pz = this.ent.z;
    for (let i = this.idx; i < this.path.length; i++) { const p = this.path[i]; d += Math.hypot(p.x - px, p.z - pz); px = p.x; pz = p.z; }
    return d;
  };
  // returns desired move dir {x,z} and next waypoint
  Nav.prototype.step = function (dt) {
    const e = this.ent;
    if (this.wiggleT > 0) { this.wiggleT -= dt; return { x: this.wiggleDir.x, z: this.wiggleDir.z, wp: null, dist: 1 }; }
    if (!this.path || this.idx >= this.path.length) return null;
    let wp = this.path[this.idx];
    // advance waypoints
    while (wp && e.level === wp.level && Math.hypot(wp.x - e.x, wp.z - e.z) < (this.idx === this.path.length - 1 ? 0.35 : 0.55)) { this.idx++; wp = this.path[this.idx]; }
    if (!wp) return null;
    if (wp.level !== e.level) {
      // stair transition pending; aim at the stair cell centre along the strip
      const prev = this.path[this.idx - 1] || wp;
      wp = { x: wp.x, z: wp.z, level: wp.level };
      if (prev.level === e.level) { /* keep heading */ }
    }
    // stuck detection
    this.stuckT += dt;
    if (this.stuckT > 1.2) {
      const moved = Math.hypot(e.x - this.lastPos.x, e.z - this.lastPos.z);
      if (moved < 0.35 && !e.interact) {
        this.stuckCount++;
        // remember this spot as bad so the next path avoids it
        const cx = Math.floor(e.x + (wp.x - e.x) * 0.5), cz = Math.floor(e.z + (wp.z - e.z) * 0.5);
        const key = e.level * 100000 + cz * W + cx; this.penalty.set(key, (this.penalty.get(key) || 0) + 6);
        // shake loose: step in a random direction before trying again
        const a = this.sim.rnd() * Math.PI * 2;
        this.wiggleDir = { x: Math.cos(a), z: Math.sin(a) }; this.wiggleT = 0.45;
        this.repath();
        if (this.stuckCount > 5) { this.failed = true; this.path = null; this.stuckCount = 0; return null; }
      } else this.stuckCount = Math.max(0, this.stuckCount - 1);
      this.stuckT = 0; this.lastPos = { x: e.x, z: e.z };
    }
    const dx = wp.x - e.x, dz = wp.z - e.z, d = Math.hypot(dx, dz) || 1;
    return { x: dx / d, z: dz / d, wp, dist: d };
  };
  // next closed door along the path within reach
  Nav.prototype.doorAhead = function (reach) {
    if (!this.path) return null;
    const w = this.sim.world, e = this.ent;
    for (let i = Math.max(0, this.idx - 1); i < Math.min(this.path.length, this.idx + 3); i++) {
      const p = this.path[i];
      // check cells along segment
      const prev = i > 0 ? this.path[i - 1] : { x: e.x, z: e.z, level: e.level };
      const n = Math.ceil(Math.hypot(p.x - prev.x, p.z - prev.z) / 0.5);
      for (let k = 0; k <= n; k++) {
        const x = prev.x + (p.x - prev.x) * k / Math.max(n, 1), z = prev.z + (p.z - prev.z) * k / Math.max(n, 1);
        if (Math.hypot(x - e.x, z - e.z) > reach) continue;
        const d = w.doorAt(p.level, Math.floor(x), Math.floor(z));
        if (d && !d.open && !d.locked) return d;
      }
    }
    return null;
  };
  Nav.prototype.pathHasType = function (type, within) {
    if (!this.path) return null;
    const w = this.sim.world, e = this.ent;
    let acc = 0, px = e.x, pz = e.z;
    for (let i = Math.max(0, this.idx - 1); i < this.path.length; i++) {
      const p = this.path[i];
      const n = Math.ceil(Math.hypot(p.x - px, p.z - pz) / 0.5);
      for (let k = 0; k <= n; k++) {
        const x = px + (p.x - px) * k / Math.max(n, 1), z = pz + (p.z - pz) * k / Math.max(n, 1);
        const dd = acc + Math.hypot(x - px, z - pz);
        if (dd > within) return null;
        if (w.get(p.level, Math.floor(x), Math.floor(z)) === type) return { x, z, d: dd };
      }
      acc += Math.hypot(p.x - px, p.z - pz); px = p.x; pz = p.z;
    }
    return null;
  };

  // ======================= MONSTER AI =======================
  function MonsterAI(sim, m) {
    this.sim = sim; this.m = m;
    this.state = 'roam'; this.stateT = 0;
    this.mem = {};          // survivor id -> {x,z,level,t,vx,vz,seen}
    this.noises = [];       // heard noises
    this.interest = {};     // station id -> weight
    this.visited = [];
    this.target = null;
    this.tension = 0;
    this.lastSoundIdx = 0;
    this.lookT = 0; this.lookYaw = m.yaw;
    this.percT = 0;
    this.revealCd = 40 + sim.rnd() * 40;
    this.mimicCd = 60;
    this.screamCd = 0;
    this.lastCatchPos = null;
    this.vantage = null; this.vantageT = 0;
    this.searchPts = []; this.searchT = 0;
    this.chaseLostT = 0;
    this.hidCheck = null;
    this.nav = new Nav(sim, m, () => ({ crawl: true, ghost: m.ghostT > 0.8 || m.cd.ghost <= 0 }));
    this.patience = (20 + sim.rnd() * 30) * sim.diff.monPatience;
    this.dbg = '';
  }
  HG.MonsterAI = MonsterAI;
  const M = MonsterAI.prototype;

  M.setState = function (s, why) {
    if (this.state !== s) {
      this.prev = this.state; this.state = s; this.stateT = 0; this.dbg = why || '';
      if (s === 'chase') this.sim.stats.chases++;
      this.sim.emit({ type: 'monsterState', state: s });
    }
  };
  M.aggression = function () {
    const ph = this.sim.phase;
    return this.sim.diff.aggression * ([0, 0.15, 0.7, 1.0, 1.3, 1.6][ph]) * (0.8 + this.sim.time / this.sim.timeLimit * 0.5);
  };

  // ---------- perception ----------
  M.perceive = function () {
    const sim = this.sim, m = this.m, now = sim.time;
    this.visible = [];
    for (const s of sim.survivors) {
      if (!s.alive || s.escaped) continue;
      const conf = sim.monsterSees(m, s);
      if (conf > 0) {
        const prev = this.mem[s.id];
        const vx = prev && now - prev.t < 1 ? (s.x - prev.x) / Math.max(0.05, now - prev.t) : 0;
        const vz = prev && now - prev.t < 1 ? (s.z - prev.z) / Math.max(0.05, now - prev.t) : 0;
        this.mem[s.id] = { x: s.x, z: s.z, level: s.level, t: now, vx, vz, seen: true, ref: s, hid: null };
        this.visible.push(s);
        if (s.interact) this.noteInterest(s.x, s.z, 2);
      } else if (sim.monsterSeesBeam(m, s)) {
        const prev = this.mem[s.id];
        if (!prev || now - prev.t > 1.5) {
          const fz = 2 + Math.hypot(s.x - m.x, s.z - m.z) * 0.06;
          this.mem[s.id] = { x: s.x + (sim.rnd() - 0.5) * fz, z: s.z + (sim.rnd() - 0.5) * fz, level: s.level, t: now, vx: 0, vz: 0, seen: false, beam: true, ref: s };
        }
      }
      // saw them disappear into a hiding place?
      const mm = this.mem[s.id];
      if (s.hidden && mm && now - mm.t < 1.2 && mm.seen && !mm.hid) mm.hid = s.hidden;
    }
    // hearing
    const S = sim.sounds;
    for (let i = 0; i < S.length; i++) {
      const s = S[i];
      if (s._mHeard || s.src === m || s.ambient || now - s.t > 1) continue;
      s._mHeard = true;
      const aud = sim.audibility(s, m.x, m.z, m.level) * sim.diff.monHear;
      if (aud <= 0.01) continue;
      const d = Math.hypot(s.x - m.x, s.z - m.z);
      const fuzz = 1 + d * 0.12 * (1 - aud);
      const nx = s.x + (sim.rnd() - 0.5) * fuzz, nz = s.z + (sim.rnd() - 0.5) * fuzz;
      let weight = aud;
      if (s.task || s.kind === 'generator' || s.kind.startsWith('task')) weight *= 1.6;
      if (s.kind === 'step' && s.sprint) weight *= 1.3;
      if (s.kind === 'voice' || s.kind === 'hit' || s.kind === 'death_scream') weight *= 1.4;
      if (s.kind === 'mstep' || s.kind === 'dash' || s.kind === 'scream') continue;
      this.noises.push({ x: nx, z: nz, level: s.level, t: now, w: weight, kind: s.kind, mimic: s.mimic });
      if (weight > 0.2) this.m.headTurn = clamp(angDiff(m.yaw, angTo(m.x, m.z, s.x, s.z)), -1.2, 1.2);
      if (s.src && s.src.kind === 'survivor') {
        const prev = this.mem[s.src.id];
        if (!prev || (!prev.seen && now - prev.t > 0.5) || now - prev.t > 3) this.mem[s.src.id] = { x: nx, z: nz, level: s.level, t: now, vx: 0, vz: 0, seen: false, heard: true, ref: s.src };
      }
      if (s.task || s.kind === 'generator') this.noteInterest(s.x, s.z, aud * 3);
    }
    this.noises = this.noises.filter(n => now - n.t < 14);
  };
  M.noteInterest = function (x, z, w) {
    const st = this.sim.world.stations;
    for (const k in st) if (Math.hypot(st[k].x - x, st[k].z - z) < 10) this.interest[k] = Math.min(10, (this.interest[k] || 0) + w);
  };
  M.freshTargets = function (maxAge) {
    const now = this.sim.time, out = [];
    for (const id in this.mem) { const mm = this.mem[id]; if (mm.ref.alive && !mm.ref.escaped && now - mm.t < maxAge) out.push(mm); }
    return out;
  };
  // how many survivors does the monster believe are near a point
  M.groupSizeNear = function (x, z, r) {
    let n = 0; const now = this.sim.time;
    for (const id in this.mem) { const mm = this.mem[id]; if (mm.ref.alive && !mm.ref.escaped && now - mm.t < 6 && Math.hypot(mm.x - x, mm.z - z) < r) n++; }
    return n;
  };
  M.watchers = function () {
    // survivors currently seeing the monster (it can tell when lights are on it)
    let n = 0;
    for (const s of this.sim.survivors) if (s.alive && !s.escaped && this.sim.survivorSees(s, this.m).seen) n++;
    return n;
  };

  // ---------- main ----------
  M.update = function (dt) {
    const sim = this.sim, m = this.m, c = m.ctrl;
    this.stateT += dt;
    this.percT -= dt;
    this.mimicCd -= dt; this.revealCd -= dt;
    if (this.percT <= 0) { this.percT = 0.12; this.perceive(); }
    m.headTurn *= Math.pow(0.3, dt);
    for (const k in this.interest) this.interest[k] *= Math.pow(0.985, dt);
    c.mx = 0; c.mz = 0; c.run = false;
    if (m.recoverT > 0 || m.stumbleT > 0 || m.pounceWind > 0 || m.pounceT > 0) { c.yaw = m.yaw; return; }
    if (m.grabbed) { this.dragVictim(dt); return; }
    if (sim.phase === 1 && this.state !== 'chase') { this.dormant(dt); return; }
    this.think(dt);
    this.act(dt);
  };

  M.dormant = function (dt) {
    // phase 1: drift through the deep woods, far from the house; still reacts to someone very close
    const m = this.m;
    if (this.visible.length && Math.hypot(this.visible[0].x - m.x, this.visible[0].z - m.z) < 10) { this.target = this.visible[0]; this.setState('chase', 'close in dormancy'); this.act(dt); return; }
    if (!this.nav.goal || this.nav.arrived(1.5) || this.nav.failed) {
      const p = this.sim.world.randomOpenNear(this.sim.rnd, 0, m.x, m.z, 8, 22, {}, 30);
      if (p && Math.hypot(p.x - 62, p.z - 61) > 38) this.nav.setGoal(p);
    }
    this.moveAlong(dt, { stalk: false });
  };

  M.think = function (dt) {
    const sim = this.sim, m = this.m, now = sim.time;
    const agg = this.aggression();
    const vis = this.visible;
    // choose the most interesting visible target
    let best = null, bs = -1e9;
    for (const s of vis) {
      const d = Math.hypot(s.x - m.x, s.z - m.z);
      const grp = this.groupSizeNear(s.x, s.z, 10);
      let sc = -d * 0.6 - grp * 4 + (s.health === 1 ? 6 : 0) + (s.interact ? 5 : 0) + (this.target === s ? 6 : 0) + (s.isPlayer ? 2 : 0);
      if (sc > bs) { bs = sc; best = s; }
    }
    switch (this.state) {
      case 'roam': case 'investigate': case 'search': case 'reposition': case 'hunt': {
        if (best) {
          const d = Math.hypot(best.x - m.x, best.z - m.z);
          this.target = best;
          const isolated = this.groupSizeNear(best.x, best.z, 11) <= 1;
          const vulnerable = best.health === 1 || best.interact || !sim.flashlightActive(best);
          const early = sim.phase <= 2;
          if (d < 4.5 || (this.state === 'hunt' && !early && d < 14) || (!early && d < 9 && (isolated || vulnerable) && agg > 0.6 && sim.rnd() < 0.5)) this.setState('chase', 'spotted close');
          else if (this.state === 'reposition' && this.stateT < 8 && d > 5) { /* keep repositioning */ }
          else this.setState('stalk', 'spotted');
          break;
        }
        // react to noises
        const n = this.bestNoise();
        if (n && (this.state === 'roam' || (this.state === 'search' && n.w > 0.3) || (this.state === 'investigate' && n !== this.noiseTarget && n.w > (this.noiseTarget ? this.noiseTarget.w * 1.2 : 0)))) {
          this.noiseTarget = n; n.used = true;
          this.setState('investigate', 'noise ' + n.kind);
          break;
        }
        // fresh memory of a survivor → hunt
        const fresh = this.freshTargets(5).filter(mm => !mm.used);
        if (fresh.length && (this.state === 'roam' || this.state === 'search') && agg > 0.3) {
          fresh.sort((a, b) => b.t - a.t);
          fresh[0].used = true;
          if (sim.phase >= 3) { this.huntMem = fresh[0]; this.setState('hunt', 'memory'); }
          else { this.noiseTarget = { x: fresh[0].x, z: fresh[0].z, level: fresh[0].level, t: now, w: 0.5, kind: 'memory', used: true }; this.setState('investigate', 'memory (early)'); }
        }
        break;
      }
      case 'stalk': {
        const t = this.target;
        if (!t || !t.alive || t.escaped) { this.setState('search', 'target gone'); break; }
        const mm = this.mem[t.id];
        const d = Math.hypot(t.x - m.x, t.z - m.z);
        if (best && best !== t) { // switch to a better (isolated / wounded) target
          const db = Math.hypot(best.x - m.x, best.z - m.z);
          if (db < d * 0.6 && this.groupSizeNear(best.x, best.z, 10) <= 1) this.target = best;
        }
        if (!mm || now - mm.t > 7) { this.huntMem = mm; this.setState('hunt', 'lost stalk target'); break; }
        const isolated = this.groupSizeNear(mm.x, mm.z, 11) <= 1;
        const busy = !!t.interact || t.hidden;
        const facingAway = (() => { const dx = m.x - t.x, dz = m.z - t.z, dd = Math.hypot(dx, dz) || 1; return (dx * -Math.sin(t.yaw) + dz * -Math.cos(t.yaw)) / dd < 0.2; })();
        let rate = agg * (isolated ? 1.6 : 0.6) * (busy ? 1.6 : 1) * (t.health === 1 ? 1.5 : 1) * [0, 0, 0.45, 1, 1.6, 2][sim.phase];
        this.tension += dt * rate / this.patience;
        const spotted = vis.includes(t) && sim.survivorSees(t, m).seen;
        if (spotted && d < 7 && (sim.phase >= 3 || d < 4)) { this.setState('chase', 'spotted by target close'); break; }
        if (spotted && this.tension < 0.6 && d > 9) {
          // seen: melt back into the dark and come again from elsewhere
          if (sim.rnd() < 0.6) { this.setState('reposition', 'spotted while stalking'); break; }
        }
        if ((this.tension >= 1 && d < 22) || (d < 9 && (isolated || busy) && facingAway && this.tension > 0.35) || (d < 5)) {
          this.tension = 0;
          // break up groups first
          if (!isolated && m.cd.scream <= 0 && d < 15 && sim.rnd() < 0.7) { m.ctrl.scream = true; this.screamed = now; }
          // lights on us / lit room: darkness first
          else if ((sim.lampLit(t.x, t.z, t.level) > 0 || this.watchers() >= 2) && m.cd.darkness <= 0 && d < 14) m.ctrl.darkness = true;
          this.setState('chase', 'strike');
        }
        // mimicry: lure with the voice of a missing survivor
        if (this.mimicCd <= 0 && this.lastVictim && d > 10 && d < 30 && sim.rnd() < 0.02) {
          this.mimicCd = 70 + sim.rnd() * 60;
          const v = this.lastVictim;
          const lines = ['Help... please, over here...', "I'm hurt... I'm by the trees...", 'Guys? Where did everyone go?', "Don't leave me out here..."];
          sim.say(m, lines[Math.floor(sim.rnd() * lines.length)], { mimic: true, mimicName: v.name, voice: v.prof.voice, pitch: (v.prof.pitch || 1) * 0.92 });
        }
        break;
      }
      case 'chase': {
        const t = this.target;
        if (!t || !t.alive || t.escaped) { this.target = null; this.setState('search', 'target down'); break; }
        const mm = this.mem[t.id];
        if (t.hidden) {
          if (mm && mm.hid) { this.hidCheck = mm.hid; this.setState('search', 'saw them hide'); }
          else { this.setState('search', 'target vanished'); }
          break;
        }
        if (vis.includes(t)) this.chaseLostT = 0; else this.chaseLostT += dt;
        if (best && best !== t && !vis.includes(t)) { this.target = best; this.chaseLostT = 0; }
        const d = Math.hypot(t.x - m.x, t.z - m.z);
        if (this.chaseLostT > 1.8 + this.sim.diff.aggression * 0.8) { this.huntMem = mm; this.searchCenter = { x: mm.x + mm.vx * 2, z: mm.z + mm.vz * 2, level: mm.level }; this.setState('search', 'lost in chase'); break; }
        if (m.runEnergy <= 0.02 && d > 12 && !vis.includes(t)) { this.setState('reposition', 'out of breath'); break; }
        if (this.stateT > 35 && d > 10) { this.setState('reposition', 'long chase'); break; }
        break;
      }
    }
  };
  M.bestNoise = function () {
    let best = null, bs = 0.05;
    const now = this.sim.time;
    for (const n of this.noises) {
      if (n.used) continue;
      const age = now - n.t;
      let sc = n.w * (1 - age / 14);
      if (n.mimic) sc = 0;
      if (sc > bs) { bs = sc; best = n; }
    }
    return best;
  };

  M.act = function (dt) {
    const sim = this.sim, m = this.m, c = m.ctrl, now = sim.time;
    switch (this.state) {
      case 'roam': {
        if (!this.nav.goal || this.nav.arrived(2) || this.nav.failed || this.stateT > 45) {
          this.stateT = 0;
          this.nav.setGoal(this.pickRoamPoint());
        }
        const nearHouse = Math.hypot(m.x - 62, m.z - 61) < 26;
        this.moveAlong(dt, { stalk: nearHouse && sim.rnd() < 0.98 ? m.stalking || this.stateT % 20 < 12 : false });
        this.scanLook(dt);
        break;
      }
      case 'investigate': {
        const n = this.noiseTarget;
        if (!n) { this.setState('roam'); break; }
        if (!this.nav.goal || this.nav.goal.src !== n) {
          const g = { level: n.level, x: n.x, z: n.z, src: n };
          if (!this.nav.setGoal(g, this.stealthCost())) { this.setState('roam', 'noise unreachable'); break; }
        }
        const d = this.nav.remaining();
        const stealth = d < 22;
        const crawlHere = d < 14 && this.inTallGrass() && sim.phase >= 2;
        this.moveAlong(dt, { stalk: stealth, crawl: crawlHere, run: d > 30 && n.w > 0.5 && sim.phase >= 3 });
        if (this.nav.arrived(2.5) || this.nav.failed || this.stateT > 30) {
          this.searchCenter = { x: n.x, z: n.z, level: n.level };
          this.searchPts = [];
          this.setState('search', 'arrived at noise');
        }
        break;
      }
      case 'hunt': {
        const mm = this.huntMem;
        if (!mm) { this.setState('roam'); break; }
        const pred = Math.min(4, (now - mm.t) * 0.6 + 1.5);
        const g = { level: mm.level, x: clamp(mm.x + mm.vx * pred, 2, 125), z: clamp(mm.z + mm.vz * pred, 2, 122) };
        if (!this.nav.goal || this.stateT < 0.2 || Math.hypot(this.nav.goal.x - g.x, this.nav.goal.z - g.z) > 3) this.nav.setGoal(g);
        const d = this.nav.remaining();
        this.moveAlong(dt, { run: d > 12 && now - mm.t < 6 && sim.phase >= 3 && m.runEnergy > 0.5, stalk: d < 14 });
        if (this.nav.arrived(2.2) || this.nav.failed || this.stateT > 25) { this.searchCenter = g; this.searchPts = []; this.setState('search', 'hunt arrived'); }
        break;
      }
      case 'search': {
        if (this.stateT < dt * 1.5) this.planSearch();
        if (this.hidCheck) {
          const h = this.hidCheck;
          if (!this.nav.goal || this.nav.goal.hide !== h) this.nav.setGoal({ level: h.level, x: h.ix, z: h.iz, hide: h });
          this.moveAlong(dt, {});
          if (Math.hypot(m.x - h.ix, m.z - h.iz) < 1.1 || this.nav.failed) {
            m.ctrl.yaw = angTo(m.x, m.z, h.x, h.z);
            if (!m.searchHide && !this.nav.failed) c.usePressed = true;
            this.hidCheck = null;
          }
          break;
        }
        if (!this.searchPts.length || this.stateT > 26) { this.setState(sim.phase >= 4 && sim.rnd() < 0.5 ? 'reposition' : 'roam', 'search over'); break; }
        const p = this.searchPts[0];
        if (!this.nav.goal || this.nav.goal !== p) this.nav.setGoal(p);
        this.moveAlong(dt, { stalk: true });
        if (this.nav.arrived(1.4) || this.nav.failed) {
          if (p.hide && !this.nav.failed) { m.ctrl.yaw = angTo(m.x, m.z, p.hide.x, p.hide.z); c.usePressed = true; }
          this.searchPts.shift(); this.lookT = 1.4 + sim.rnd();
        }
        if (this.lookT > 0) { this.lookT -= dt; c.mx = c.mz = 0; this.scanLook(dt, 2.2); }
        break;
      }
      case 'stalk': this.actStalk(dt); break;
      case 'chase': this.actChase(dt); break;
      case 'reposition': {
        if (this.stateT < dt * 1.5 || !this.nav.goal) {
          const p = this.pickAmbushPoint();
          this.nav.setGoal(p, this.stealthCost());
          // ghost through a veil if it helps
          this.waitT = 6 + sim.rnd() * 10;
        }
        if (this.nav.arrived(1.6) || this.nav.failed) {
          this.waitT -= dt; c.mx = c.mz = 0;
          if (this.inTallGrass() && !m.crawling) c.crawl = true;
          this.scanLook(dt, 0.7);
          if (this.waitT <= 0 || this.stateT > 40) { if (m.crawling) c.crawl = false; this.setState('roam', 'ambush timeout'); }
        } else {
          const watched = this.watchers();
          if (watched >= 2 && m.cd.ghost <= 0 && sim.rnd() < 0.3) c.ghost = true;
          this.moveAlong(dt, { stalk: true, run: this.stateT < 3 && watched > 0 });
        }
        break;
      }
    }
    // reveal: deliberately show itself at a distance, then vanish
    if ((this.state === 'stalk' || this.state === 'roam') && this.revealCd <= 0 && sim.phase >= 2 && sim.phase <= 4) this.tryReveal();
  };

  M.inTallGrass = function () {
    const m = this.m; if (m.level !== 0) return false;
    return this.sim.world.cover[Math.floor(m.z) * W + Math.floor(m.x)] === 1;
  };
  M.stealthCost = function () {
    const w = this.sim.world, sim = this.sim;
    return (l, i, x, z) => {
      if (l !== 0) return 0;
      let c = 0;
      if (w.cover[i] === 1 || w.cover[i] === 2) c -= 0.25;
      if (w.pathDist[i] < 1.5) c += 0.35;
      for (const L of w.lamps) if (L.on && L.level === 0 && Math.abs(L.x - x) < L.r && Math.abs(L.z - z) < L.r) c += 0.6;
      return Math.max(c, -0.3);
    };
  };

  M.scanLook = function (dt, speed) {
    const m = this.m;
    this.lookPhase = (this.lookPhase || 0) + dt * (speed || 0.8);
    const base = m.vx || m.vz ? Math.atan2(-m.vx, -m.vz) : m.yaw;
    m.ctrl.yaw = base + Math.sin(this.lookPhase) * 0.9;
  };

  M.moveAlong = function (dt, o) {
    const m = this.m, c = m.ctrl, sim = this.sim;
    o = o || {};
    const dir = this.nav.step(dt);
    if (!dir) { c.mx = c.mz = 0; return false; }
    c.mx = dir.x; c.mz = dir.z;
    if (!o.noFace) {
      const want = Math.atan2(-dir.x, -dir.z);
      const cur = m.yaw;
      c.yaw = cur + clamp(angDiff(cur, want), -dt * 6, dt * 6);
    }
    // crawl through gaps; ghost through veils
    const crawlCell = this.nav.pathHasType(T.CRAWL, 1.6);
    const veil = this.nav.pathHasType(T.VEIL, 2.2);
    const wantCrawl = !!crawlCell || (o.crawl && !o.run);
    if (wantCrawl && !m.crawling && m.ghostT <= 0) c.crawl = true;
    else if (!wantCrawl && m.crawling && !sim.crawlBlocked(m)) c.crawl = false;
    if (veil && m.ghostT <= 0.6) {
      if (m.cd.ghost <= 0) c.ghost = true;
      else { this.nav.repath(); } // caps will exclude ghost now
    }
    c.run = !!o.run && !m.crawling;
    if (c.stalk === null && m.stalking !== !!o.stalk) c.stalk = !!o.stalk && !o.run;
    return true;
  };

  M.pickRoamPoint = function () {
    const sim = this.sim, w = sim.world, m = this.m;
    const cands = [];
    const now = sim.time;
    for (const k in w.stations) { const st = w.stations[k]; cands.push({ level: st.level, x: st.x, z: st.z, w: 1 + (this.interest[k] || 0) * 1.5, key: k }); }
    for (const c of w.containers) if (sim.rnd() < 0.25) cands.push({ level: c.level, x: c.x, z: c.z, w: 0.5, key: c.id });
    // around the house: windows and doors
    for (const p of [[49, 60], [75, 60], [62, 51], [62, 72], [56, 72], [68, 50]]) cands.push({ level: 0, x: p[0], z: p[1], w: 1.2 + sim.phase * 0.3, key: 'h' + p });
    for (let i = 0; i < 6; i++) { const x = 6 + sim.rnd() * 116, z = 6 + sim.rnd() * 104; if (w.passable(0, Math.floor(x), Math.floor(z), {})) cands.push({ level: 0, x: Math.floor(x) + 0.5, z: Math.floor(z) + 0.5, w: 0.6, key: 'r' + i }); }
    let best = null, bs = -1e9;
    for (const c of cands) {
      const v = this.visited.find(v => v.key === c.key);
      const novelty = v ? Math.min(1, (now - v.t) / 120) : 1;
      const d = Math.hypot(c.x - m.x, c.z - m.z);
      let sc = c.w * 2 + novelty * 2 - d * 0.025 + sim.rnd() * 1.8;
      if (d < 6) sc -= 4;
      if (c.level !== 0) sc -= sim.phase < 3 ? 2 : 0.5;
      if (sc > bs) { bs = sc; best = c; }
    }
    this.visited.push({ key: best.key, t: now });
    if (this.visited.length > 20) this.visited.shift();
    return { level: best.level, x: best.x, z: best.z };
  };

  M.planSearch = function () {
    const sim = this.sim, w = sim.world;
    const c = this.searchCenter || { x: this.m.x, z: this.m.z, level: this.m.level };
    this.searchPts = [];
    // nearby hiding places get checked, the closest first
    const hides = w.hides.filter(h => h.level === c.level && Math.hypot(h.x - c.x, h.z - c.z) < 14 && sim.time - h.lastOpened > 25).sort((a, b) => Math.hypot(a.x - c.x, a.z - c.z) - Math.hypot(b.x - c.x, b.z - c.z));
    for (let i = 0; i < 4; i++) {
      const p = w.randomOpenNear(sim.rnd, c.level, c.x, c.z, 2, 9, {}, 20);
      if (p) this.searchPts.push(p);
    }
    const nh = Math.min(hides.length, sim.phase >= 3 ? 2 : 1);
    for (let i = 0; i < nh; i++) if (sim.rnd() < 0.75) this.searchPts.splice(1 + i, 0, { level: hides[i].level, x: hides[i].ix, z: hides[i].iz, hide: hides[i] });
  };

  M.pickAmbushPoint = function () {
    const sim = this.sim, w = sim.world, m = this.m;
    // go somewhere the survivors will need to visit, but out of their sight
    const active = [];
    for (const t of sim.tasks) if (!t.done) { const st = w.stations[t.steps[t.stepIdx].station]; if (st && st.level === 0) active.push(st); }
    const stations = active.length && this.interest ? active : Object.values(w.stations);
    let best = null, bs = -1e9;
    for (let k = 0; k < 16; k++) {
      const st = stations[Math.floor(sim.rnd() * stations.length)];
      const p = w.randomOpenNear(sim.rnd, 0, st.x, st.z, 6, 14, {}, 10);
      if (!p) continue;
      let sc = (this.interest[st.id] || 0) + sim.rnd() * 2;
      const ci = Math.floor(p.z) * W + Math.floor(p.x);
      if (w.cover[ci] === 1) sc += 2; if (w.cover[ci] === 2) sc += 1;
      for (const mm of this.freshTargets(10)) { const d = Math.hypot(mm.x - p.x, mm.z - p.z); if (d < 12) sc -= 3; }
      if (Math.hypot(p.x - m.x, p.z - m.z) < 8) sc -= 2;
      if (sc > bs) { bs = sc; best = p; }
    }
    return best || w.randomOpenNear(sim.rnd, 0, m.x, m.z, 15, 30, {}, 30) || { level: 0, x: 30.5, z: 30.5 };
  };

  M.actStalk = function (dt) {
    const sim = this.sim, m = this.m, c = m.ctrl, t = this.target, w = sim.world;
    const mm = this.mem[t.id];
    if (!mm) return;
    this.vantageT -= dt;
    const d = Math.hypot(mm.x - m.x, mm.z - m.z);
    const late = sim.phase >= 4;
    if (!this.vantage || this.vantageT <= 0 || (this.nav.arrived(1.2) && this.vantageT < 2.5)) {
      this.vantage = this.pickVantage(mm, late ? 9 : 12, late ? 15 : 20);
      this.vantageT = 3.5 + sim.rnd() * 2.5;
      if (this.vantage) this.nav.setGoal(this.vantage, this.stealthCost());
    }
    const lookAt = () => { c.yaw = m.yaw + clamp(angDiff(m.yaw, angTo(m.x, m.z, mm.x, mm.z)), -dt * 4, dt * 4); };
    if (this.vantage && !this.nav.arrived(1.0)) {
      const grass = this.inTallGrass();
      this.moveAlong(dt, { stalk: true, crawl: grass && d < 18 });
      if (d < 16) lookAt();
    } else {
      c.mx = c.mz = 0;
      if (this.inTallGrass() && d < 16 && !m.crawling) c.crawl = true;
      lookAt();
      m.eyesT = 1;
    }
  };
  M.pickVantage = function (mm, rmin, rmax) {
    const sim = this.sim, w = sim.world, m = this.m;
    const t = mm.ref;
    let best = null, bs = -1e9;
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2 + sim.rnd() * 0.4;
      const r = rmin + sim.rnd() * (rmax - rmin);
      const x = mm.x + Math.cos(a) * r, z = mm.z + Math.sin(a) * r;
      const cx = Math.floor(x), cz = Math.floor(z);
      if (!w.passable(t.level === mm.level ? mm.level : 0, cx, cz, { crawl: true })) continue;
      const lvl = mm.level;
      const px = cx + 0.5, pz = cz + 0.5;
      let sc = 0;
      // stay outside the target's view and flashlight
      const dx = px - t.x, dz = pz - t.z, dd = Math.hypot(dx, dz) || 1;
      const cos = (dx * -Math.sin(t.yaw) + dz * -Math.cos(t.yaw)) / dd;
      sc -= Math.max(0, cos) * 6;
      for (const o of sim.survivors) if (o.alive && o !== t && o.level === lvl && sim.flashlightActive(o)) {
        const ox = px - o.x, oz = pz - o.z, od = Math.hypot(ox, oz) || 1;
        if (od < 20 && (ox * -Math.sin(o.yaw) + oz * -Math.cos(o.yaw)) / od > 0.8) sc -= 4;
        if (od < 7) sc -= 3;
      }
      if (w.los(lvl, px, pz, mm.x, mm.z).clear) sc += 2.5; // can watch
      if (sim.lampLit(px, pz, lvl) > 0) sc -= 4;
      const ci = cz * W + cx;
      if (lvl === 0) { if (w.cover[ci] === 1) sc += 1.8; if (w.cover[ci] === 2) sc += 1.2; for (let oz = -1; oz <= 1; oz++) for (let ox = -1; ox <= 1; ox++) if (w.get(0, cx + ox, cz + oz) === T.TREE) sc += 0.5; }
      sc -= Math.hypot(px - m.x, pz - m.z) * 0.12;
      if (sc > bs) { bs = sc; best = { level: lvl, x: px, z: pz }; }
    }
    return best;
  };

  M.actChase = function (dt) {
    const sim = this.sim, m = this.m, c = m.ctrl, t = this.target, w = sim.world;
    const mm = this.mem[t.id];
    const seeNow = this.visible.includes(t);
    const tx = seeNow ? t.x : mm.x + mm.vx * Math.min(this.chaseLostT, 2), tz = seeNow ? t.z : mm.z + mm.vz * Math.min(this.chaseLostT, 2);
    const tl = seeNow ? t.level : mm.level;
    const d = Math.hypot(tx - m.x, tz - m.z);
    if (m.ghostT > 0 && d < 6) { /* wait for it to fade */ }
    // direct pursuit when in clear sight & close, else path
    const direct = seeNow && tl === m.level && d < 10 && w.walkLine(m.level, m.x, m.z, tx, tz, { crawl: false }, 0.35);
    if (direct) {
      const dx = tx - m.x, dz = tz - m.z, dd = Math.hypot(dx, dz) || 1;
      // lead the target a little
      const lead = Math.min(0.5, dd / 12);
      const lx = tx + (t.vx || 0) * lead - m.x, lz = tz + (t.vz || 0) * lead - m.z, ll = Math.hypot(lx, lz) || 1;
      c.mx = lx / ll; c.mz = lz / ll;
      c.yaw = Math.atan2(-c.mx, -c.mz);
      this.nav.goal = null;
      if (m.crawling) c.crawl = false;
    } else {
      const g = { level: tl, x: tx, z: tz };
      if (!this.nav.goal || this.nav.repathT > 0.6 || Math.hypot(this.nav.goal.x - g.x, this.nav.goal.z - g.z) > 2.5) { this.nav.setGoal(g, null, true); }
      this.nav.repathT += dt;
      this.moveAlong(dt, { run: true });
    }
    c.run = d > 2.2 || !seeNow;
    if (c.stalk === null && m.stalking) c.stalk = false;
    // abilities
    if (seeNow && direct && d > 3.4 && d < 8.5 && m.cd.dash <= 0 && m.attackCd <= 0 && sim.rnd() < dt * 3) {
      const fx = -Math.sin(m.yaw), fz = -Math.cos(m.yaw);
      const dx = tx - m.x, dz = tz - m.z;
      if ((dx * fx + dz * fz) / d > 0.92) c.dash = true;
    }
    if (this.stateT < dt * 1.5) this.grabRoll = sim.rnd() < 0.35;
    // choose an attack: pounce from range, grab the unaware or the hurt, swipe otherwise
    const fx2 = -Math.sin(m.yaw), fz2 = -Math.cos(m.yaw);
    const aim = ((tx - m.x) * fx2 + (tz - m.z) * fz2) / (d || 1);
    const AT = HG.ATTACKS;
    const unaware = (() => { const dx = m.x - t.x, dz = m.z - t.z, dd = Math.hypot(dx, dz) || 1; return (dx * -Math.sin(t.yaw) + dz * -Math.cos(t.yaw)) / dd < 0.1; })();
    if (seeNow && direct && d > AT.pounce.min && d < AT.pounce.max - 0.5 && aim > 0.94 && m.cd.pounce <= 0 && m.attackCd <= 0 && m.dashT <= 0 && sim.rnd() < dt * (0.5 + sim.diff.aggression * 0.6)) c.pounce = true;
    else if (seeNow && d < AT.grab.range - 0.2 && aim > 0.5 && m.cd.grab <= 0 && m.attackCd <= 0 && m.attackWind <= 0 && m.grabWind <= 0 && (unaware || t.health === 1 || t.interact || t.downT > 0 || this.grabRoll)) c.grab = true;
    else if (seeNow && d < MON_RANGE() && m.attackCd <= 0 && m.attackWind <= 0 && m.grabWind <= 0 && aim > 0.5) c.attack = true;
    // a roar when it commits to the chase
    if (this.stateT < dt * 1.5 && this.prev === 'stalk' && sim.rnd() < 0.6) sim.emitSound('roar', m.x, m.z, m.level, 45, m);
    // lit room or multiple flashlights pinning it: kill the lights
    if (seeNow && d < 13 && m.cd.darkness <= 0 && (sim.lampLit(t.x, t.z, t.level) > 0.3 || (this.watchers() >= 2 && sim.rnd() < dt))) c.darkness = true;
    // a group scattering: scream to panic them
    if (seeNow && m.cd.scream <= 0 && this.groupSizeNear(t.x, t.z, 9) >= 3 && d < 14 && sim.rnd() < dt * 0.6) c.scream = true;
    // shortcut through a veil when the target is beyond one
    if (!direct && m.cd.ghost <= 0 && this.nav.pathHasType(T.VEIL, 3)) c.ghost = true;
  };
  function MON_RANGE() { return HG.MON.attackRange - 0.15; }

  // holding a victim: drag them away from the others, into the dark
  M.dragVictim = function (dt) {
    const sim = this.sim, m = this.m, c = m.ctrl;
    let gx = 0, gz = 0, n = 0;
    for (const s of sim.survivors) if (s.alive && !s.escaped && s !== m.grabbed && s.level === m.level && Math.hypot(s.x - m.x, s.z - m.z) < 25) { gx += s.x; gz += s.z; n++; }
    let ax, az;
    if (n) { ax = m.x - gx / n; az = m.z - gz / n; } else { ax = m.x - 62; az = m.z - 61; }
    const l = Math.hypot(ax, az) || 1;
    // walk backwards, keeping the victim in front
    c.mx = ax / l; c.mz = az / l;
    const face = Math.atan2(-(m.grabbed.x - m.x), -(m.grabbed.z - m.z));
    c.yaw = m.yaw + clamp(HG.angDiff(m.yaw, face), -dt * 3, dt * 3);
    c.run = false;
  };

  M.tryReveal = function () {
    const sim = this.sim, m = this.m;
    // pick a survivor (prefer the player) who is looking our way with a light; step into the beam far away
    const p = sim.survivors.find(s => s.isPlayer && s.alive && !s.escaped) || sim.survivors.find(s => s.alive && !s.escaped);
    if (!p || p.level !== m.level) return;
    const d = Math.hypot(p.x - m.x, p.z - m.z);
    if (d < 14 || d > 26) return;
    const s = sim.survivorSees(p, m);
    if (s.seen) {
      this.revealCd = 70 + sim.rnd() * 70;
      m.revealT = 1.6; m.eyesT = 1.6;
      this.sim.emit({ type: 'reveal' });
      // vanish afterwards
      this.setState('reposition', 'revealed');
    }
  };

  M.onBreak = function (s) { if (this.sim.rnd() > this.aggression() * 0.5) { this.target = null; this.setState('reposition', 'victim broke free'); } };
  M.onHit = function (s) {
    this.lastHitT = this.sim.time;
    // it toys with wounded prey: often withdraws into the dark instead of finishing the chase
    if (this.sim.rnd() > this.aggression() * 0.55) { this.target = null; this.setState('reposition', 'toying after hit'); }
  };
  M.onCatch = function (s) {
    this.lastVictim = s; this.lastCatchPos = { x: s.x, z: s.z, level: s.level };
    this.target = null; this.tension = 0;
    this.mimicCd = Math.min(this.mimicCd, 25 + this.sim.rnd() * 30);
    delete this.mem[s.id];
    this.setState('reposition', 'after catch');
  };

  // ======================= DIRECTOR =======================
  // Ambient "is that real?" events that are NOT the monster.
  function Director(sim) { this.sim = sim; this.next = 25 + sim.rnd() * 20; this.quietT = 0; this.events = 0; }
  HG.Director = Director;
  Director.prototype.update = function (dt) {
    const sim = this.sim;
    this.quietT = Math.max(0, this.quietT - dt);
    const m = sim.monster;
    const p = sim.player && sim.player.kind === 'survivor' && sim.player.alive ? sim.player : sim.survivors.find(s => s.alive && !s.escaped);
    // the forest goes quiet when the monster is near the listener
    sim.forestQuiet = this.quietT > 0 || (p && m.level === p.level && Math.hypot(m.x - p.x, m.z - p.z) < 22);
    this.next -= dt;
    if (this.next > 0 || !p) return;
    this.next = 18 + sim.rnd() * 32;
    if (m.ai && m.ai.state === 'chase') return;
    const w = sim.world;
    const r = sim.rnd();
    const at = (dmin, dmax) => { const a = sim.rnd() * 6.28, d = dmin + sim.rnd() * (dmax - dmin); return { x: clamp(p.x + Math.cos(a) * d, 3, 124), z: clamp(p.z + Math.sin(a) * d, 3, 110) }; };
    this.events++;
    if (r < 0.16) { const q = at(12, 30); sim.emitSound('branch', q.x, q.z, 0, 20, null, { ambient: true, fake: true }); }
    else if (r < 0.26) { const q = at(25, 50); sim.emitSound('owl', q.x, q.z, 0, 60, null, { ambient: true }); }
    else if (r < 0.33) { const q = at(40, 70); sim.emitSound('fox', q.x, q.z, 0, 90, null, { ambient: true, fake: true }); }
    else if (r < 0.48 && p.level === 0 && w.isHouse(0, p.x, p.z)) {
      // a door drifts open on its own somewhere you aren't looking
      const doors = w.doors.filter(d => !d.open && !d.locked && d.level === 0 && Math.hypot(d.cx - p.x, d.cz - p.z) > 4 && Math.hypot(d.cx - p.x, d.cz - p.z) < 14);
      if (doors.length) { const d = doors[Math.floor(sim.rnd() * doors.length)]; d.open = true; d.swing = 1; d.lastUse = sim.time; d.openedBy = 'wind'; sim.emitSound('door_open', d.cx + 0.5, d.cz + 0.5, d.level, 8, null, { ambient: true, slow: true, doorId: d.id }); }
    }
    else if (r < 0.58 && w.isHouse(p.level, p.x, p.z)) { sim.emitSound('thump', 62 + (sim.rnd() - 0.5) * 8, 59 + (sim.rnd() - 0.5) * 6, p.level === 2 ? 0 : 2, 16, null, { ambient: true, fake: true }); }
    else if (r < 0.68) { const q = at(3, 8); sim.emitSound('creak', q.x, q.z, p.level, 9, null, { ambient: true, fake: true }); }
    else if (r < 0.76) { this.quietT = 15 + sim.rnd() * 15; sim.emit({ type: 'quiet' }); }
    else if (r < 0.84) { for (const L of w.lamps) if (L.level === p.level && Math.hypot(L.x - p.x, L.z - p.z) < 12) L.flick = 0.4 + sim.rnd() * 0.8; sim.emit({ type: 'flicker' }); }
    else if (r < 0.92) { sim.emitSound('radio_burst', 67.5, 63.0, 0, 14, null, { ambient: true, fake: true }); }
    else { sim.emitSound('knock', 52.5 + (sim.rnd() < 0.5 ? 0 : 19), 58 + sim.rnd() * 6, 0, 12, null, { ambient: true, fake: true }); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
