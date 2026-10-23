/* Hollow Pines — survivor bot AI. Each bot has a personality, fear, memory and limited perception. */
(function (G) {
  'use strict';
  const HG = G.HG;
  const { clamp } = HG.util;
  const T = HG.T, W = HG.W;
  const angTo = HG.angTo, angDiff = HG.angDiff;

  const LINES = {
    spotted: ["It's here! {where}!", 'I see it! {where}!', 'Oh God, it\'s {where}!', 'Run! It\'s {where}!'],
    heard: ['Did you hear that?', 'Something is moving out there.', 'Footsteps... {where}.', 'Shh. Listen.'],
    strange: ['What was that?', 'Tell me you heard that.', "That wasn't the wind.", 'Okay. Okay. Just a noise.'],
    found: ['Found the {item} {where}.', 'Got the {item}!', '{item}. Got it.'],
    foundLeft: ['There\'s {item} {where}. My hands are full.', 'Left the {item} {where}, can\'t carry it.'],
    nothing: ['Nothing here.', 'Empty.', 'Just junk.'],
    delivered: ['{item} is in place.', 'Dropped off the {item}.'],
    working: ['Working on the {station}. Watch my back.', "I'm at the {station}. Cover me.", 'Starting on the {station}.'],
    taskDone: ['{task}. Done!', "That's done. {task}.", 'Okay! {task}, finished.'],
    wounded: ['It got me! I\'m bleeding!', 'Agh! I\'m hit!', "I'm hurt, I'm hurt!"],
    needPatch: ["I'm bleeding. Someone patch me up.", 'Need help here, I\'m hurt.'],
    patching: ['Hold still, I got you.', 'Let me see. Okay. Hold still.'],
    hiding: ["I'm hiding. Don't come this way.", 'Hiding. Stay quiet.'],
    refuse: ["I'm not going down there alone.", 'No. Not by myself. Someone come with me.', "Nope. Not alone, not down there."],
    follow: ["I'm with you.", 'Right behind you.', "Okay. I'll stick close."],
    release: ["Okay, splitting up. I'll find something to do.", 'Got it. I\'ll check around.'],
    missing: ['Has anyone heard from {name}?', '{name}? {name}, answer me.', "Where's {name}? {name}'s not answering."],
    gone: ["{name}'s gone. I heard it... {where}.", "It got {name}. Oh God, it got {name}."],
    lightDying: ['My light is dying.', 'Batteries are almost dead.'],
    regroup: ['Everyone back to the house!', 'Regroup at the house. Now.'],
    escape: ["The gate's open! Go! Go!", 'Gate is open! Everyone to the road!'],
    fear: ["I can't do this.", 'We are not getting out of here.', 'Breathe. Just breathe.', "I want to go home."],
    calm: ['Stay close.', 'Keep your light low.', 'Check your corners.'],
    notThem: ["That's not {name}. {name} is gone. Don't go out there.", "Don't answer it. That's not {name}."],
    lure: ['{name}? Is that you? Hold on!', "{name}! I'm coming!"],
    rescue: ["Hold on, {name}! I'm coming!", "Let go of {name}! LET GO!", "Pull! Pull, {name}!", "I've got you, {name}, fight it!"],
    grabbed: ["NO! NO! LET GO!", "HELP ME! IT'S GOT ME!", "Get it off! GET IT OFF!", "Please! Please no!"],
    lostIt: ['I think I lost it.', "Is it gone? I think it's gone.", 'Lost it. I think.'],
    whereItem: ['Anyone seen the {item}?']
  };
  HG.LINES = LINES;

  function SurvivorAI(sim, s) {
    this.sim = sim; this.s = s;
    this.nav = new HG.Nav(sim, s, { crawl: false, ghost: false });
    this.job = null; this.jobT = 0;
    this.threat = null;
    this.decideT = sim.rnd() * 0.4;
    this.mode = 'job';
    this.lookT = 0; this.glanceYaw = null;
    this.leader = null; this.leaderUntil = 0; this.buddy = null;
    this.hideUntil = 0;
    this.goalCd = new Map();
    this.refusedT = -99; this.lastSpotSay = -99;
    this.knownGone = new Set(); this.suspectMissing = new Map();
    this.investigate = null;
    this.saidWorking = null;
    this.prevPos = { x: s.x, z: s.z };
    this.closeDoor = null;
    this.nextGlance = 3 + sim.rnd() * 4;
  }
  HG.SurvivorAI = SurvivorAI;
  const A = SurvivorAI.prototype;

  A.say = function (cat, vars, opts) {
    const sim = this.sim, s = this.s;
    opts = opts || {};
    if (s.voiceCd > 0 && !opts.force) return;
    if (!opts.force && sim.time - (sim.lastVoiceT || -99) < 2.2) return;
    const arr = LINES[cat]; let line = arr[Math.floor(sim.rnd() * arr.length)];
    vars = vars || {};
    line = line.replace(/\{(\w+)\}/g, (_, k) => vars[k] !== undefined ? vars[k] : '');
    line = line.charAt(0).toUpperCase() + line.slice(1);
    if (s.prof.trait === 'Jittery' && sim.rnd() < 0.3 && cat !== 'found') line = 'Oh God. ' + line;
    sim.say(s, line, { whisper: opts.whisper, shout: opts.shout });
    sim.lastVoiceT = sim.time;
    s.voiceCd = opts.cd || 6;
  };

  // ---------- perception ----------
  A.perceive = function (dt) {
    const sim = this.sim, s = this.s, m = sim.monster, now = sim.time;
    const see = sim.survivorSees(s, m);
    s.seesMonster = see.seen;
    if (see.seen) {
      const firstSight = !this.threat || now - this.threat.t > 6 || !this.threat.seen;
      this.threat = { x: m.x, z: m.z, level: m.level, t: now, seen: true, vx: m.vx, vz: m.vz, faint: see.faint };
      const prevSight = sim.team.lastSighting;
      const alreadyCalled = prevSight && prevSight.by !== s.id && now - prevSight.calledT < 5 && Math.hypot(prevSight.x - m.x, prevSight.z - m.z) < 12;
      sim.team.lastSighting = { x: m.x, z: m.z, level: m.level, t: now, by: alreadyCalled ? prevSight.by : s.id, calledT: alreadyCalled ? prevSight.calledT : (prevSight && prevSight.calledT) || -99 };
      s.lastSeenMonster = now;
      if (firstSight) {
        sim.team.sightings.push({ x: m.x, z: m.z, level: m.level, t: now });
        s.fear = clamp(s.fear + 0.28 * (1.3 - s.bravery), 0, 1);
        if (now - this.lastSpotSay > 8 && (!alreadyCalled || sim.rnd() < 0.15)) { this.lastSpotSay = now; sim.team.lastSighting.calledT = now; sim.team.lastSighting.by = s.id; this.say('spotted', { where: sim.world.regionName(m.level, m.x, m.z) }, { force: true, shout: true, cd: 4 }); }
        // a moment of terror: some freeze
        if (s.bravery < 0.45 && sim.rnd() < 0.45 * (1.1 - s.smarts) && see.dist > 4) s.freezeT = 0.5 + sim.rnd() * 0.8;
        this.decideT = 0;
      }
    }
    // hearing
    for (const snd of sim.sounds) {
      if (snd._h && snd._h[s.id]) continue;
      if (now - snd.t > 0.6 || snd.src === s) continue;
      (snd._h = snd._h || {})[s.id] = 1;
      const aud = sim.audibility(snd, s.x, s.z, s.level);
      if (aud <= 0.05) continue;
      const k = snd.kind;
      const fromMonster = snd.src === m;
      if (fromMonster && !snd.mimic) {
        const loud = k === 'dash' || k === 'scream' || (k === 'mstep' && (snd.mode === 'run' || snd.mode === 'dash'));
        if (aud > 0.12 || loud) {
          const d = Math.hypot(snd.x - s.x, snd.z - s.z);
          const fz = 1 + d * 0.15;
          if (!this.threat || now - this.threat.t > 0.8 || !this.threat.seen) this.threat = { x: snd.x + (sim.rnd() - 0.5) * fz, z: snd.z + (sim.rnd() - 0.5) * fz, level: snd.level, t: now, seen: false, loud };
          s.fear = clamp(s.fear + (loud ? 0.06 : 0.02) * aud * (1.3 - s.bravery), 0, 1);
          s.heardT = now;
          if (!loud && sim.rnd() < 0.15 && aud > 0.2) this.say('heard', { where: sim.world.regionName(snd.level, snd.x, snd.z) }, { whisper: true });
          if (loud) this.decideT = Math.min(this.decideT, 0.1);
        }
      } else if (snd.mimic) {
        if (aud > 0.12) this.onMimic(snd, aud);
      } else if (snd.fake || k === 'owl' || k === 'fox') {
        if (aud > 0.25) {
          s.fear = clamp(s.fear + 0.035 * (1.2 - s.bravery), 0, 1);
          if (sim.rnd() < 0.25) this.say('strange', {}, { whisper: true });
          if (s.bravery > 0.65 && s.fear < 0.4 && !this.investigate && sim.rnd() < 0.35 && snd.level === s.level) this.investigate = { x: snd.x, z: snd.z, level: snd.level, t: now };
        }
      } else if (k === 'death_scream' && snd.src && snd.src !== s) {
        this.knownGone.add(snd.src.id);
        sim.team.dangers.push({ x: snd.x, z: snd.z, level: snd.level, t: now });
      } else if (k === 'hit' && snd.src && snd.src !== s && aud > 0.1) {
        this.threat = { x: snd.x, z: snd.z, level: snd.level, t: now, seen: false, loud: true };
        s.fear = clamp(s.fear + 0.1, 0, 1);
      }
    }
    // shared knowledge over the radio
    const ls = sim.team.lastSighting;
    if (ls && now - ls.t < 6 && (!this.threat || ls.t > this.threat.t + 0.5)) this.threat = { x: ls.x, z: ls.z, level: ls.level, t: ls.t, seen: false, radio: true };
  };

  A.onMimic = function (snd, aud) {
    const sim = this.sim, s = this.s;
    const name = (sim.events.slice().reverse().find(e => e.type === 'say' && e.mimic) || {}).name;
    const victim = sim.survivors.find(o => o.name === name);
    if (!victim) return;
    s.fear = clamp(s.fear + 0.08, 0, 1);
    if (this.knownGone.has(victim.id) && s.smarts > 0.45) { this.say('notThem', { name }, { force: true }); return; }
    if (s.bravery > 0.55 && sim.rnd() < 0.6) { this.say('lure', { name }, { force: true }); this.investigate = { x: snd.x, z: snd.z, level: snd.level, t: sim.time, lure: true }; }
  };

  A.onTeammateCaught = function (v) {
    const sim = this.sim, s = this.s;
    // only certain if heard it; otherwise they notice missing later
    if (this.knownGone.has(v.id)) {
      s.fear = clamp(s.fear + 0.25 * (1.3 - s.bravery), 0, 1);
      if (sim.rnd() < 0.5) this.say('gone', { name: v.name, where: sim.world.regionName(v.level, v.x, v.z) }, { force: true });
    } else this.suspectMissing.set(v.id, sim.time + 18 + sim.rnd() * 25);
    if (this.leader === v) this.leader = null;
    if (this.buddy === v) this.buddy = null;
  };
  A.onScream = function (m, aud) {
    // panic: some scatter, some freeze
    const s = this.s, sim = this.sim;
    if (s.bravery < 0.5 && sim.rnd() < 0.5) s.freezeT = 0.4 + sim.rnd() * 0.6;
    this.threat = { x: m.x, z: m.z, level: m.level, t: sim.time, seen: false, loud: true };
    this.panicFlee = sim.time + 2.5;
    this.decideT = 0;
  };
  A.onTeammateGrabbed = function (v) {
    const s = this.s, sim = this.sim;
    const d = v.level === s.level ? Math.hypot(v.x - s.x, v.z - s.z) : 99;
    if (d < 22 && (s.bravery > 0.45 || v.isPlayer && s.social > 0.6) && sim.rnd() < 0.4 + s.bravery * 0.5) {
      this.rescue = v; this.rescueUntil = sim.time + 4; this.decideT = 0;
      this.say('rescue', { name: v.name }, { force: true, shout: true });
    } else s.fear = clamp(s.fear + 0.2, 0, 1);
  };
  A.onDarkness = function () { this.s.fear = clamp(this.s.fear + 0.05, 0, 1); if (this.sim.rnd() < 0.3) this.say('strange', {}, { whisper: true }); };
  A.onHit = function (m) { this.say(this.s.grabbedBy ? 'grabbed' : 'wounded', {}, { force: true, shout: true, cd: 4 }); this.threat = { x: m.x, z: m.z, level: m.level, t: this.sim.time, seen: true, loud: true }; this.decideT = 0; };
  A.onPatched = function (o) { };
  A.onPatchedBy = function (o) { };
  A.onSearched = function (c, found) {
    const sim = this.sim, s = this.s;
    const need = sim.neededItems();
    const useful = found.filter(f => need[f] || f === 'medkit');
    if (useful.length) this.say('found', { item: HG.ITEMS[useful[0]], where: sim.world.regionName(c.level, c.x, c.z) }, { force: sim.rnd() < 0.7 });
    else if (!c.items.length && sim.rnd() < 0.3) this.say('nothing', {}, { whisper: true });
    for (const left of c.items) if (need[left]) this.say('foundLeft', { item: HG.ITEMS[left], where: sim.world.regionName(c.level, c.x, c.z) }, { force: true });
    this.job = null; this.decideT = 0;
  };

  // ---------- helpers ----------
  A.distTo = function (x, z, l) { const s = this.s; return Math.hypot(x - s.x, z - s.z) + Math.abs(l - s.level) * 8; };
  A.threatInfo = function () {
    const t = this.threat, s = this.s, now = this.sim.time;
    if (!t) return { age: 99, dist: 99 };
    const age = now - t.t;
    const dist = t.level === s.level ? Math.hypot(t.x - s.x, t.z - s.z) : (Math.abs(t.level - s.level) * 10 + Math.hypot(t.x - s.x, t.z - s.z));
    return { age, dist, seen: t.seen, loud: t.loud };
  };
  A.dangerAt = function (x, z, l) {
    const sim = this.sim, now = sim.time; let d = 0;
    for (const sg of sim.team.sightings) if (sg.level === l && now - sg.t < 40) { const dd = Math.hypot(sg.x - x, sg.z - z); if (dd < 16) d += (1 - dd / 16) * (1 - (now - sg.t) / 40) * 4; }
    for (const dz of sim.team.dangers) if (dz.level === l && now - dz.t < 150) { const dd = Math.hypot(dz.x - x, dz.z - z); if (dd < 10) d += (1 - dd / 10) * 3; }
    if (this.threat && this.threat.level === l && now - this.threat.t < 15) { const dd = Math.hypot(this.threat.x - x, this.threat.z - z); if (dd < 14) d += (1 - dd / 14) * 5 * (1 - (now - this.threat.t) / 15); }
    return d;
  };
  A.pathCost = function () {
    const sim = this.sim, now = sim.time, th = this.threat;
    const sights = sim.team.sightings.filter(sg => now - sg.t < 30);
    return (l, i, x, z) => {
      let c = 0;
      if (th && th.level === l && now - th.t < 12) { const d = Math.hypot(th.x - x, th.z - z); if (d < 10) c += (10 - d) * 0.8; }
      for (const sg of sights) if (sg.level === l) { const d = Math.hypot(sg.x - x, sg.z - z); if (d < 8) c += (8 - d) * 0.25; }
      return c;
    };
  };
  A.mates = function (r) {
    const s = this.s; let n = 0;
    for (const o of this.sim.survivors) if (o !== s && o.alive && !o.escaped && o.level === s.level && Math.hypot(o.x - s.x, o.z - s.z) < r) n++;
    return n;
  };
  A.findInteract = function (kind, ref) {
    const list = this.sim.interactablesFor(this.s);
    return list.find(it => it.kind === kind && (ref === undefined || it.ref === ref));
  };
  A.claim = function (key, sec) { this.sim.claims = this.sim.claims || new Map(); this.sim.claims.set(key, { id: this.s.id, until: this.sim.time + (sec || 12) }); };
  A.claimedByOther = function (key) {
    const c = this.sim.claims && this.sim.claims.get(key);
    if (!c || c.until < this.sim.time || c.id === this.s.id) return false;
    const o = this.sim.survivors.find(x => x.id === c.id);
    return o && o.alive && !o.escaped;
  };

  // ---------- decision ----------
  A.update = function (dt) {
    const sim = this.sim, s = this.s, c = s.ctrl, now = sim.time;
    this.perceive(dt);
    // notice missing teammates
    for (const [id, t] of this.suspectMissing) if (now > t) {
      this.suspectMissing.delete(id);
      const v = sim.survivors.find(o => o.id === id);
      if (v && !v.alive && !this.knownGone.has(id)) { this.knownGone.add(id); s.fear = clamp(s.fear + 0.15, 0, 1); if (!sim.team.missing.includes(id)) { sim.team.missing.push(id); this.say('missing', { name: v.name }, { force: true }); } }
    }
    c.mx = 0; c.mz = 0; c.sprint = false; c.crouch = false;
    if (s.freezeT > 0) { c.use = false; if (this.threat) c.yaw = angTo(s.x, s.z, this.threat.x, this.threat.z); return; }
    this.decideT -= dt;
    if (this.decideT <= 0) { this.decideT = 0.35 + this.sim.rnd() * 0.15; this.decide(); }
    this.execute(dt);
    this.manageLight(dt);
    this.lookAround(dt);
  };

  A.decide = function () {
    const sim = this.sim, s = this.s, now = sim.time;
    const ti = this.threatInfo();
    const m = sim.monster;
    // a teammate is in its grip: brave ones charge in and pull
    if (this.rescue && (!this.rescue.grabbedBy || now > this.rescueUntil + 4 || !this.rescue.alive)) this.rescue = null;
    if (this.rescue && this.rescue.grabbedBy && !s.grabbedBy) { this.setMode('rescue'); return; }
    // gate open: get out
    if (sim.gateState === 'open') { if (s.hidden && ti.age > 3) sim.exitHide(s); if (!s.hidden) this.setMode('escape'); return; }
    // hidden: wait it out
    if (s.hidden) {
      const calm = 10 + (1 - s.bravery) * 14;
      if (ti.age > calm || (sim.gateState === 'opening' && ti.age > 5)) { this.setMode('job'); sim.exitHide(s); }
      else this.setMode('hiding');
      return;
    }
    const approaching = this.threat && this.threat.seen && ti.age < 1.5 && (() => {
      const dx = s.x - this.threat.x, dz = s.z - this.threat.z, d = Math.hypot(dx, dz) || 1;
      return ((this.threat.vx || 0) * dx + (this.threat.vz || 0) * dz) / d > 1.0;
    })();
    const urgent = (ti.seen && ti.age < 2 && ti.dist < (approaching ? 26 : 16)) || (ti.loud && ti.age < 2.5 && ti.dist < 14) || (this.panicFlee && now < this.panicFlee) || (s.health === 1 && s.burstT > 0);
    if (urgent) {
      // hide if it hasn't committed to us and a hiding place is right here
      const hide = this.nearestHide(7);
      const canHide = hide && ti.dist > 11 && !approaching && (s.bravery < 0.6 || s.smarts > 0.6) && !(s.burstT > 0) && sim.rnd() < 0.8;
      if (canHide && this.mode !== 'flee') { this.hideTarget = hide; this.setMode('hide'); this.say('hiding', {}, { whisper: true }); return; }
      if (this.mode !== 'flee' || !this.fleeGoal || now - this.fleeT > 1.5 || this.nav.arrived(1.2) || this.nav.failed) this.planFlee();
      this.setMode('flee');
      return;
    }
    if (this.mode === 'flee' && ti.age > 1.0 && ti.age < 4) {
      // broke line of sight: duck into a hiding place if one is right here
      const hide = this.nearestHide(5);
      if (hide && sim.rnd() < 0.5 + s.smarts * 0.4) { this.hideTarget = hide; this.setMode('hide'); return; }
    }
    if (this.mode === 'flee' && ti.age < 4 && ti.dist < 18) return; // keep running a bit
    if (this.mode === 'flee') { if (sim.rnd() < 0.5) this.say('lostIt', {}, { whisper: true }); }
    if (this.mode === 'hide' && this.hideTarget && !this.hideTarget.occupant && ti.age < 10) return;
    // alert: something nearby but not in sight
    if (ti.age < 6 && ti.dist < 13 && !s.interact) {
      const hide = this.nearestHide(6);
      if (hide && s.bravery < 0.5 && sim.rnd() < 0.5) { this.hideTarget = hide; this.setMode('hide'); return; }
      this.setMode('evade'); return;
    }
    // investigate a noise (brave) / a lure
    if (this.investigate && now - this.investigate.t < 25 && ti.age > 8) { this.setMode('investigate'); return; }
    this.investigate = null;
    // wounded
    if (s.health === 1 && !(this.patchGiveUp > now)) {
      if (s.carry.includes('medkit')) { s.ctrl.medkit = true; this.setMode('heal'); return; }
      // another wounded survivor right here: patch each other
      const hurtMate = sim.survivors.find(o => o !== s && o.alive && !o.escaped && o.health === 1 && !o.hidden && !o.grabbedBy && o.level === s.level && Math.hypot(o.x - s.x, o.z - s.z) < 6);
      const healthy = sim.survivors.some(o => o !== s && o.alive && !o.escaped && o.health === 2 && !o.hidden && o.level === s.level && Math.hypot(o.x - s.x, o.z - s.z) < 40);
      if (hurtMate && (!healthy || s.id < hurtMate.id)) { this.patchTarget = hurtMate; this.setMode('patch'); return; }
      if (healthy) {
        if (this.mode === 'needPatch' && this.modeT > 30) this.patchGiveUp = now + 45; // nobody came: keep working
        else { this.setMode('needPatch'); return; }
      }
    }
    // patch a wounded teammate nearby
    const hurt = sim.survivors.find(o => o !== s && o.alive && !o.escaped && o.health === 1 && !o.hidden && o.level === s.level && Math.hypot(o.x - s.x, o.z - s.z) < 22 && o.burstT <= 0);
    if (hurt && ti.age > 6 && (s.social > 0.45 || hurt.isPlayer)) { this.patchTarget = hurt; this.setMode('patch'); return; }
    // reload
    if (s.battery < 0.12 && s.batteries > 0) s.ctrl.reload = true;
    if (s.battery < 0.15 && s.batteries === 0 && sim.rnd() < 0.05) this.say('lightDying', {}, {});
    // drop items nobody needs anymore
    const need = sim.neededItems();
    for (const it of s.carry.slice()) if (!need[it] && it !== 'medkit') { s.carry.splice(s.carry.indexOf(it), 1); sim.dropItem(it, s.x, s.z, s.level); }
    // follow orders
    if (this.leader && (!this.leader.alive || this.leader.escaped || now > this.leaderUntil)) this.leader = null;
    if (this.leader) { this.setMode('follow'); return; }
    // carrying something the team needs: deliver it, with an escort if scared
    const carriesNeeded = s.carry.some(it => need[it]);
    if (carriesNeeded && s.fear > 0.4 && (!this.escortAsked || now - this.escortAsked > 40)) {
      let best = null, bd = 40;
      for (const o of sim.survivors) if (o !== s && o.ai && o.alive && !o.escaped && !o.hidden && o.level === s.level && (o.ai.mode === 'idle' || o.ai.mode === 'buddy') && !o.carry.some(it => need[it])) { const d = Math.hypot(o.x - s.x, o.z - s.z); if (d < bd) { bd = d; best = o; } }
      if (best) { this.escortAsked = now; best.ai.leader = s; best.ai.leaderUntil = now + 70; best.ai.decideT = 0; best.ai.say('follow', {}, {}); }
    }
    // nervous bots stick to a braver buddy when scared
    if (s.bravery < 0.4 && s.fear > 0.5 && !carriesNeeded) {
      if (!this.buddy || !this.buddy.alive || this.buddy.escaped) this.buddy = this.pickBuddy();
      if (this.buddy) { this.setMode('buddy'); return; }
    } else if (s.fear < 0.3) this.buddy = null;
    // jobs
    const job = this.pickJob();
    if (job) { this.job = job; this.setMode('job'); return; }
    // nothing to do: go keep a teammate with work company
    const worker = sim.survivors.find(o => o !== s && o.alive && !o.escaped && !o.hidden && o.level === s.level && o.carry.some(it => need[it]));
    if (worker && !this.leader) { this.leader = worker; this.leaderUntil = now + 45; this.setMode('follow'); return; }
    this.setMode('idle');
  };
  A.setMode = function (m) {
    if (this.mode !== m) {
      this.mode = m; this.modeT = 0;
      if (m !== 'job') { this.s.ctrl.use = false; }
      if (m === 'flee' || m === 'hide' || m === 'evade') { this.job = null; if (this.s.interact) this.s.interact = null; }
    }
  };
  A.pickBuddy = function () {
    const s = this.s; let best = null, bd = 30;
    for (const o of this.sim.survivors) if (o !== s && o.alive && !o.escaped && !o.hidden && o.level === s.level && (o.bravery > s.bravery || o.isPlayer)) {
      const d = Math.hypot(o.x - s.x, o.z - s.z); if (d < bd) { bd = d; best = o; }
    }
    return best;
  };
  A.nearestHide = function (r) {
    const s = this.s, now = this.sim.time; let best = null, bd = r;
    for (const h of this.sim.world.hides) {
      if (h.occupant || h.level !== s.level) continue;
      if (now - h.lastOpened < 8) continue;
      const d = Math.hypot(h.ix - s.x, h.iz - s.z);
      if (d < bd) { bd = d; best = h; }
    }
    return best;
  };

  A.planFlee = function () {
    const sim = this.sim, s = this.s, w = sim.world, th = this.threat;
    this.fleeT = sim.time;
    const ax = s.x - th.x, az = s.z - th.z, ad = Math.hypot(ax, az) || 1;
    const cands = [];
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      for (const r of [9, 16]) {
        const x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r;
        const cx = Math.floor(x), cz = Math.floor(z);
        if (!w.passable(s.level, cx, cz, {}) || w.get(s.level, cx, cz) !== T.OPEN) continue;
        cands.push({ level: s.level, x: cx + 0.5, z: cz + 0.5 });
      }
    }
    // lit house and teammates are attractive (if not where the monster is)
    if (s.level === 0) cands.push({ level: 0, x: 58.5, z: 64.5, house: true }, { level: 0, x: 67.5, z: 65.5, house: true });
    for (const o of sim.survivors) if (o !== s && o.alive && !o.escaped && o.level === s.level && !o.hidden) cands.push({ level: o.level, x: o.x, z: o.z, mate: true });
    let scored = cands.map(cd => {
      const dx = cd.x - s.x, dz = cd.z - s.z, dd = Math.hypot(dx, dz) || 1;
      const away = (dx * ax + dz * az) / (dd * ad);
      const dm = Math.hypot(cd.x - th.x, cd.z - th.z);
      let sc = away * 8 + dm * 0.25 - dd * 0.05;
      if (cd.house && sim.houseCircuit()) sc += 3;
      if (cd.mate) sc += 2;
      if (!w.los(s.level, th.x, th.z, cd.x, cd.z).clear) sc += 3;
      if (w.cover[Math.floor(cd.z) * W + Math.floor(cd.x)] === 2) sc += 1;
      if (dm < 6) sc -= 20;
      return { cd, sc };
    }).sort((a, b) => b.sc - a.sc);
    // mistakes under pressure: sometimes the panicked choice is wrong
    if (sim.rnd() < (1 - s.smarts) * s.fear * 0.35 && scored.length > 4) {
      const k = 1 + Math.floor(sim.rnd() * Math.min(6, scored.length - 1));
      [scored[0], scored[k]] = [scored[k], scored[0]];
    }
    for (let i = 0; i < Math.min(4, scored.length); i++) {
      const g = scored[i].cd;
      if (this.nav.setGoal(g, this.pathCost(), true)) {
        // path should not start toward the monster
        const p = this.nav.path[Math.min(1, this.nav.path.length - 1)];
        const dx = p.x - s.x, dz = p.z - s.z, dd = Math.hypot(dx, dz) || 1;
        if ((dx * ax + dz * az) / (dd * ad) < -0.5 && i < 3) continue;
        this.fleeGoal = g; return;
      }
    }
    this.fleeGoal = scored.length ? scored[0].cd : null;
  };

  A.pickJob = function () {
    const sim = this.sim, s = this.s, w = sim.world, now = sim.time;
    const jobs = [];
    const need = sim.neededItems();
    const unknownNeed = {};
    const knownByKind = {};
    for (const [key, e] of sim.team.items) { (knownByKind[e.kind] = knownByKind[e.kind] || []).push(Object.assign({ key }, e)); }
    for (const it of sim.items) (knownByKind[it.kind] = knownByKind[it.kind] || []).push({ key: 'loose:' + it.id, kind: it.kind, loose: it, x: it.x, z: it.z, level: it.level });
    const othersInside = (l) => sim.survivors.some(o => o !== s && o.alive && !o.escaped && o.level === l);
    for (const t of sim.tasks) {
      if (t.done) continue;
      const st = t.steps[t.stepIdx];
      const S = w.stations[st.station];
      if (st.kind === 'deliver') {
        const rem = st.items.slice(); for (const d of st.delivered) rem.splice(rem.indexOf(d), 1);
        for (const it of rem) {
          if (s.carry.includes(it)) jobs.push({ type: 'deliver', key: 'dl:' + t.id + ':' + it, task: t, step: st, item: it, x: S.x, z: S.z, level: S.level, base: 10 });
        }
      } else if (st.kind === 'hold' || st.kind === 'puzzle') {
        const workers = sim.survivors.filter(o => o !== s && o.alive && o.interact && o.interact.step === st).length;
        jobs.push({ type: 'work', key: 'wk:' + t.id + ':' + t.stepIdx, task: t, step: st, x: S.x, z: S.z, level: S.level, base: 7 + (workers ? 1.5 : 0), joinable: true });
      } else if (st.kind === 'zone') {
        jobs.push({ type: 'zone', key: 'zn:' + t.id, task: t, step: st, x: S.x, z: S.z, level: S.level, base: 6.5, joinable: true, r: S.r });
      }
    }
    // items the team still needs (carried by nobody)
    const carried = {};
    for (const o of sim.survivors) if (o.alive && !o.escaped) for (const it of o.carry) carried[it] = (carried[it] || 0) + 1;
    for (const kind in need) {
      const still = need[kind] - (carried[kind] || 0);
      if (still <= 0) continue;
      const known = knownByKind[kind] || [];
      if (known.length && s.carry.length < 2) for (const e of known) jobs.push({ type: 'fetch', key: 'ft:' + e.key, item: kind, entry: e, x: e.x, z: e.z, level: e.level, base: 7.5 });
      else if (!known.length) unknownNeed[kind] = still;
    }
    // search unsearched containers when something is still unaccounted for (or for batteries)
    const anyUnknown = Object.keys(unknownNeed).length > 0;
    if (anyUnknown || s.batteries === 0 || (s.health === 1)) {
      for (const c of w.containers) {
        if (c.searched || c.locked || sim.team.searched.has(c.id)) continue;
        let base = anyUnknown ? 5 : 2.5;
        // smart bots reason about where things would be kept
        if (s.smarts > 0.5) for (const k in unknownNeed) if ((HG_SPAWN_HINT[k] || []).includes(c.id)) base += 1.5 * s.smarts;
        jobs.push({ type: 'search', key: 'sr:' + c.id, container: c, x: c.x, z: c.z, level: c.level, base });
      }
    }
    // gate opening: gather near the gate
    if (sim.gateState === 'opening') jobs.push({ type: 'goto', key: 'gate', x: 64, z: 109, level: 0, base: 9 });
    // restart the generator when it stalls
    if (sim.generatorFixed && !sim.generatorRunning) jobs.push({ type: 'restart', key: 'restart', x: w.stations.generator.x, z: w.stations.generator.z, level: 0, base: 5 });

    let best = null, bs = -1e9;
    for (const j of jobs) {
      if (this.goalCd.get(j.key) > now) continue;
      const d = this.distTo(j.x, j.z, j.level);
      let sc = j.base - d * 0.06;
      if (this.claimedByOther(j.key) && !j.joinable) sc -= 8;
      if (j.joinable) {
        const near = sim.survivors.filter(o => o !== s && o.alive && !o.escaped && Math.hypot(o.x - j.x, o.z - j.z) < 6 && o.level === j.level).length;
        sc += Math.min(near, 2) * 0.8 * s.social;
        if (near >= 2) sc -= 2.5; // enough hands there already
      }
      const danger = this.dangerAt(j.x, j.z, j.level);
      sc -= danger * (1.4 - s.bravery);
      // far, dark places scare the nervous
      const farOut = j.level === 0 ? Math.hypot(j.x - 62, j.z - 61) : 0;
      const alone = this.mates(14) === 0;
      if (s.bravery < 0.45 && farOut > 24 && alone) sc -= (0.5 - s.bravery) * 7 * (0.6 + s.fear);
      if (j.level !== 0 && !othersInside(j.level) && s.bravery < 0.45) {
        sc -= 3.5 * (0.6 - s.bravery) * 3;
        if (j === jobs.find(x => x.level !== 0) && now - this.refusedT > 60 && d < 15) { this.refusedT = now; this.say('refuse', {}, { force: true }); }
      }
      if (this.job && this.job.key === j.key) sc += 1.5; // hysteresis
      sc += (this.jitter = this.jitter || {})[j.key] || (this.jitter[j.key] = this.sim.rnd() * 1.2);
      if (sc > bs) { bs = sc; best = j; }
    }
    if (best) this.claim(best.key, 15);
    return best;
  };
  const HG_SPAWN_HINT = {
    fuel: ['shed_locker', 'shed_bench', 'truck_bed', 'yard_shed_box'], wrench: ['shed_toolbox', 'base_workbench', 'storage_shelf'],
    fuse: ['kitchen_drawer', 'storage_shelf', 'base_workbench'], relay: ['ps_crate', 'base_shelves'], cable: ['ps_crate', 'shed_bench', 'storage_boxes'],
    storage_key: ['base_chest', 'attic_chest', 'attic_trunk', 'bed1_dresser', 'bed1_nightstand', 'base_crates'],
    cutters: ['store_crate1', 'store_crate2'], car_battery: ['base_workbench', 'shed_locker'], spark_plugs: ['shed_toolbox', 'storage_shelf'],
    truck_keys: ['living_sideboard', 'kitchen_cabinet', 'living_desk'], breaker: ['kitchen_cabinet', 'storage_boxes'], chainsaw: ['shed_locker', 'shed_bench', 'yard_shed_box']
  };

  // ---------- execution ----------
  A.goto = function (x, z, l, r, opts) {
    opts = opts || {};
    const s = this.s, c = s.ctrl;
    const g = { level: l, x, z };
    if (!this.nav.goal || this.nav.goal.level !== l || Math.hypot(this.nav.goal.x - x, this.nav.goal.z - z) > 0.8 || this.nav.failed && this.modeT > 2) {
      if (!this.nav.setGoal(g, this.pathCost(), true)) return 'fail';
    }
    if (s.level === l && Math.hypot(s.x - x, s.z - z) < (r || 0.8)) return 'arrived';
    const dir = this.nav.step(this.dt);
    if (!dir) {
      if (this.nav.failed) return 'fail';
      // close to the end: walk straight in
      const dx = x - s.x, dz = z - s.z, d = Math.hypot(dx, dz) || 1;
      if (s.level === l && d < 2.5) { c.mx = dx / d; c.mz = dz / d; return 'moving'; }
      this.nav.repath(); return 'moving';
    }
    // open doors on the way
    const door = this.nav.doorAhead(1.4);
    if (door && !door.open) this.sim.toggleDoor(s, door, true);
    // separation from teammates
    let sx = 0, sz = 0;
    for (const o of this.sim.survivors) if (o !== s && o.alive && !o.escaped && o.level === s.level) {
      const dx = s.x - o.x, dz = s.z - o.z, d = Math.hypot(dx, dz);
      if (d < 0.9 && d > 0.01) { sx += dx / d * (0.9 - d); sz += dz / d * (0.9 - d); }
    }
    c.mx = dir.x + sx * 1.5; c.mz = dir.z + sz * 1.5;
    c.sprint = !!opts.sprint;
    c.crouch = !!opts.crouch;
    this.moveYaw = Math.atan2(-dir.x, -dir.z);
    return 'moving';
  };

  A.execute = function (dt) {
    const sim = this.sim, s = this.s, c = s.ctrl, now = sim.time;
    this.dt = dt; this.modeT = (this.modeT || 0) + dt;
    this.moveYaw = null;
    // close the door behind us when fleeing
    if (this.closeDoor) {
      const d = this.closeDoor;
      const dd = Math.hypot(d.cx + 0.5 - s.x, d.cz + 0.5 - s.z);
      if (dd > 1.0 && dd < 2.4 && d.open) { sim.toggleDoor(s, d); this.closeDoor = null; }
      else if (dd > 3) this.closeDoor = null;
    }
    switch (this.mode) {
      case 'escape': {
        this.goto(64, 119, 0, 1.2, { sprint: true });
        if (this.modeT < dt * 2 && sim.rnd() < 0.5) this.say('escape', {}, { shout: true });
        break;
      }
      case 'flee': {
        if (!this.fleeGoal) { this.planFlee(); if (!this.fleeGoal) break; }
        const r = this.goto(this.fleeGoal.x, this.fleeGoal.z, this.fleeGoal.level, 1.2, { sprint: s.stamina > 0.1 || s.burstT > 0 });
        if (r === 'arrived' || r === 'fail') this.planFlee();
        // smart survivors shut doors behind them
        if (s.smarts > 0.5 && !this.closeDoor) {
          const d = sim.doorNear(s, 0.9);
          if (d && d.open && this.threat && Math.hypot(this.threat.x - s.x, this.threat.z - s.z) > 3) this.closeDoor = d;
        }
        break;
      }
      case 'hide': {
        const h = this.hideTarget;
        if (!h || h.occupant) { this.hideTarget = null; this.decideT = 0; break; }
        const r = this.goto(h.ix, h.iz, h.level, 0.6, { sprint: this.threatInfo().dist < 10 });
        if (r === 'arrived' || (s.level === h.level && Math.hypot(h.ix - s.x, h.iz - s.z) < 0.9)) { sim.enterHide(s, h); this.setMode('hiding'); }
        if (r === 'fail') { this.goalCd.set('hide:' + h.id, now + 20); this.hideTarget = null; this.planFlee(); this.setMode('flee'); }
        break;
      }
      case 'hiding': break;
      case 'evade': {
        // move away from the threat quietly, toward teammates/house
        const th = this.threat;
        if (!th) { this.setMode('job'); break; }
        if (!this.evadeGoal || this.modeT < dt * 1.5 || this.nav.arrived(1) || this.nav.failed) {
          const mates = sim.survivors.filter(o => o !== s && o.alive && !o.escaped && !o.hidden && o.level === s.level && Math.hypot(o.x - th.x, o.z - th.z) > 12);
          mates.sort((a, b) => Math.hypot(a.x - s.x, a.z - s.z) - Math.hypot(b.x - s.x, b.z - s.z));
          if (mates.length && Math.hypot(mates[0].x - s.x, mates[0].z - s.z) < 30) this.evadeGoal = { level: s.level, x: mates[0].x, z: mates[0].z };
          else { const ax = s.x - th.x, az = s.z - th.z, d = Math.hypot(ax, az) || 1; const p = sim.world.randomOpenNear(sim.rnd, s.level, s.x + ax / d * 10, s.z + az / d * 10, 0, 4, {}, 15); this.evadeGoal = p || { level: s.level, x: s.x, z: s.z }; }
        }
        this.goto(this.evadeGoal.x, this.evadeGoal.z, this.evadeGoal.level, 1.5, { crouch: s.smarts > 0.55 && this.threatInfo().dist < 10 });
        break;
      }
      case 'investigate': {
        const iv = this.investigate;
        const r = this.goto(iv.x, iv.z, iv.level, 2.5, {});
        if (r === 'arrived' || r === 'fail' || this.modeT > 20) { this.investigate = null; this.decideT = 0; }
        break;
      }
      case 'rescue': {
        const v = this.rescue;
        if (!v || !v.grabbedBy) { this.decideT = 0; break; }
        this.goto(v.x, v.z, v.level, 1.2, { sprint: true });
        c.yaw = angTo(s.x, s.z, v.grabbedBy.x, v.grabbedBy.z);
        break;
      }
      case 'heal': if (!s.interact && s.health === 1 && !s.carry.includes('medkit')) this.decideT = 0; c.use = true; break;
      case 'needPatch': {
        // go to the nearest teammate and wait
        let best = null, bd = 99;
        for (const o of sim.survivors) if (o !== s && o.alive && !o.escaped && !o.hidden && o.level === s.level) { const d = Math.hypot(o.x - s.x, o.z - s.z); if (d < bd) { bd = d; best = o; } }
        if (best && bd > 2) this.goto(best.x, best.z, best.level, 1.8, {});
        if (this.modeT < dt * 2 && sim.rnd() < 0.6) this.say('needPatch', {}, {});
        if (!best) { const j = this.pickJob(); if (j) { this.job = j; this.runJob(dt); } }
        break;
      }
      case 'patch': {
        const o = this.patchTarget;
        if (!o || !o.alive || o.health !== 1) { this.decideT = 0; break; }
        if (Math.hypot(o.x - s.x, o.z - s.z) > 1.4 || o.level !== s.level) this.goto(o.x, o.z, o.level, 1.2, {});
        else {
          c.yaw = angTo(s.x, s.z, o.x, o.z);
          if (!s.interact) { const it = this.findInteract('patch', o); if (it) { c.useTarget = it; c.usePressed = true; this.say('patching', {}, {}); } }
          c.use = true;
        }
        break;
      }
      case 'follow': case 'buddy': {
        const L = this.mode === 'follow' ? this.leader : this.buddy;
        if (!L) { this.decideT = 0; break; }
        const d = Math.hypot(L.x - s.x, L.z - s.z) + (L.level !== s.level ? 10 : 0);
        // help with what the leader is doing
        if (L.interact && L.interact.step && d < 4) {
          if (!s.interact) { const it = this.findInteract(L.interact.kind, L.interact.ref); if (it) { c.useTarget = it; c.usePressed = true; } }
          c.use = true; c.yaw = angTo(s.x, s.z, L.interact.x, L.interact.z);
          break;
        }
        if (L.interact && L.interact.kind === 'search' && d < 6 && !s.interact) {
          const near = sim.world.containers.find(cc => !cc.searched && !cc.locked && cc.level === s.level && Math.hypot(cc.x - s.x, cc.z - s.z) < 7 && cc !== L.interact.ref);
          if (near) { this.job = { type: 'search', key: 'sr:' + near.id, container: near, x: near.x, z: near.z, level: near.level }; this.runJob(dt); break; }
        }
        if (s.interact && s.interact.kind === 'search') { c.use = true; break; }
        if (d > 2.6) this.goto(L.x, L.z, L.level, 2.2, { sprint: d > 9 || L.sprinting });
        else { c.mx = c.mz = 0; }
        break;
      }
      case 'job': this.runJob(dt); break;
      case 'idle': {
        // stay near the house / others
        const tgt = this.mates(10) ? null : { x: 58.5 + (s.id.charCodeAt(1) % 3), z: 64.5, level: 0 };
        if (tgt) this.goto(tgt.x, tgt.z, tgt.level, 2, {});
        break;
      }
    }
  };

  A.runJob = function (dt) {
    const sim = this.sim, s = this.s, c = s.ctrl, j = this.job, now = sim.time;
    if (!j) { this.decideT = 0; return; }
    const fail = () => { this.goalCd.set(j.key, now + 25); this.job = null; this.decideT = 0; c.use = false; };
    const atRange = j.type === 'zone' ? Math.max(0.8, (j.r || 4) - 1.8) : 1.0;
    if (s.interact) {
      // keep working; glance around
      c.use = true;
      return;
    }
    const r = this.goto(j.x, j.z, j.level, atRange, { sprint: false });
    if (r === 'fail') { fail(); return; }
    if (r !== 'arrived') { c.use = false; return; }
    c.mx = c.mz = 0;
    c.yaw = angTo(s.x, s.z, j.x, j.z);
    let it = null;
    switch (j.type) {
      case 'deliver': it = this.findInteract('deliver', sim.world.stations[j.step.station]); if (it && it.item !== j.item) it = it; break;
      case 'work': it = this.findInteract(j.step.kind, sim.world.stations[j.step.station]); if (it && this.saidWorking !== j.key) { this.saidWorking = j.key; if (sim.rnd() < 0.5) this.say('working', { station: sim.world.stations[j.step.station].name }, {}); } break;
      case 'zone': {
        // just stand inside and keep watch
        c.use = false;
        if (j.task.done || j.task.steps[j.task.stepIdx] !== j.step) { this.job = null; this.decideT = 0; }
        return;
      }
      case 'search': it = this.findInteract('search', j.container) || this.findInteract('take', j.container); if (!it) { this.job = null; this.decideT = 0; return; } break;
      case 'fetch': {
        const e = j.entry;
        if (e.loose) it = this.findInteract('pickup', e.loose);
        else { const cc = sim.containerById(e.container); it = this.findInteract('take', cc) || this.findInteract('search', cc); }
        if (!it) { sim.team.items.delete(e.key); this.job = null; this.decideT = 0; return; }
        break;
      }
      case 'restart': it = this.findInteract('restart'); break;
      case 'goto': return;
    }
    if (!it) { fail(); return; }
    c.useTarget = it; c.usePressed = true; c.use = true;
  };

  A.manageLight = function (dt) {
    const sim = this.sim, s = this.s, c = s.ctrl;
    if (s.hidden) return;
    let want = true;
    const lit = sim.lampLit(s.x, s.z, s.level) > 0.2;
    if (lit && s.smarts > 0.5) want = false;
    if (s.battery <= 0) want = false;
    const ti = this.threatInfo();
    if ((this.mode === 'evade' || this.mode === 'hide') && s.smarts > 0.6 && ti.dist < 14) want = false;
    if ((this.mode === 'follow' || this.mode === 'buddy') && s.battery < 0.35 && s.smarts > 0.5) want = false;
    if (this.mode === 'flee') want = !(s.smarts > 0.55 && ti.age > 0.8 && ti.dist > 7);
    // mistakes: the jittery fumble their light
    if (s.fear > 0.8 && s.smarts < 0.5 && sim.rnd() < dt * 0.05) want = !s.flashlightOn;
    if (want !== s.flashlightOn) { this.lightT = (this.lightT || 0) + dt; if (this.lightT > 0.6) { c.toggleLight = true; this.lightT = 0; } }
    else this.lightT = 0;
  };

  A.lookAround = function (dt) {
    const sim = this.sim, s = this.s, c = s.ctrl;
    if (c.yaw !== null && (this.mode === 'patch' || (s.interact && !this.glancing))) {
      // while working: smart survivors glance over their shoulder now and then
      this.nextGlance -= dt;
      if (this.nextGlance <= 0) { this.glancing = 0.9; this.glanceYaw = s.yaw + Math.PI * (0.6 + sim.rnd() * 0.8) * (sim.rnd() < 0.5 ? -1 : 1); this.nextGlance = (7 - s.smarts * 4) + sim.rnd() * 4; }
      if (this.glancing > 0) { this.glancing -= dt; c.yaw = s.yaw + clamp(angDiff(s.yaw, this.glanceYaw), -dt * 5, dt * 5); }
      return;
    }
    let want = this.moveYaw;
    if (s.freezeT > 0 && this.threat) want = angTo(s.x, s.z, this.threat.x, this.threat.z);
    if (this.mode === 'evade' && this.threat && sim.rnd() < 0.5) want = angTo(s.x, s.z, this.threat.x, this.threat.z) + Math.sin(sim.time * 1.3) * 0.5;
    if (this.mode === 'flee' && this.threat && s.bravery > 0.5 && (sim.time % 3) < 0.35) want = angTo(s.x, s.z, this.threat.x, this.threat.z);
    if (want === null || want === undefined) {
      // idle scanning
      this.lookPhase = (this.lookPhase || sim.rnd() * 6) + dt * (0.4 + s.fear);
      want = s.yaw + Math.sin(this.lookPhase) * 0.02 * 60 * dt;
      if (this.threat && sim.time - this.threat.t < 10) want = angTo(s.x, s.z, this.threat.x, this.threat.z) + Math.sin(this.lookPhase) * 0.6;
    }
    c.yaw = s.yaw + clamp(angDiff(s.yaw, want), -dt * 7, dt * 7);
    c.pitch = 0;
  };

  // commands from the player
  A.command = function (cmd, from) {
    const sim = this.sim;
    if (cmd === 'follow') { this.leader = from; this.leaderUntil = sim.time + 120; this.say('follow', {}, { force: true }); this.decideT = 0; }
    if (cmd === 'release') { this.leader = null; this.say('release', {}, { force: true }); this.decideT = 0; }
    if (cmd === 'regroup') { this.investigate = null; this.job = { type: 'goto', key: 'regroup', x: 57.5 + this.sim.rnd() * 3, z: 63.5 + this.sim.rnd() * 2, level: 0, base: 9 }; this.goalCd.clear(); this.mode = 'job'; this.decideT = 6; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
