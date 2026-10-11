// =============================================================
//  GAME — ties everything together: modes, collisions, scoring,
//  Perfect Shift / Break rules, death, victory, results.
// =============================================================
(function () {
  const C = PS.CONFIG;
  const U = PS.U;

  PS.Game = class {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.W = C.width; this.H = C.height;
      const p = C.arenaPad;
      this.arena = { x0: p, y0: p, x1: this.W - p, y1: this.H - p };
      this.clock = new PS.BeatClock();
      this.clock.listeners.push((s) => this.onStep(s));
      this.hazards = new PS.HazardSystem(this);
      this.fx = new PS.FX(this);
      this.epoch = 0;
      this.realTime = 0;
      this.timeScale = 1;
      this.slowT = 0;
      this.hitStop = 0;
      this.res = 0;
      this.cores = [];
      this.pulseOffset = 0;
      this.diff = Object.assign({ id: 'normal' }, C.difficulty.normal);
      this.mods = {};
      this.stats = this.newStats();
      this.enterMenu();
    }

    // ================= STATE CHANGES =================
    enterMenu() {
      this.state = 'menu';
      this.stopCustomAudio();
      this.boss = null; this.player = null; this.tutorial = null; this.seq = null;
      this.hazards.list = []; this.cores = [];
      this.pulseOffset = 0; this.announcement = null;
      this.track = PS.Tracks.menu;
      this.clock.reset(this.track.bpm, 0);
      this.clock.running = true;
      this.musicOff = false;
      this.bpmMult = 1;
      this.setMuffle(0);
    }

    // opts: { mode: 'practice'|'survival'|'rush'|'tutorial', boss, difficulty, modifiers }
    start(opts) {
      this.opts = Object.assign({ mode: 'practice', boss: 'metronome', difficulty: 'normal', modifiers: {} }, opts);
      this.rushIndex = 0;
      this.carryHp = null;
      this.carryRes = 0;
      this.stats = this.newStats();
      PS.Profile.data.lifetime.runs++;
      this.beginEncounter();
    }

    newStats() {
      return { score: 0, combo: 0, maxCombo: 0, perfects: 0, perfectHops: 0, dashes: 0, hops: 0, grazes: 0, hits: 0, breaks: 0, breakHits: 0, cores: 0, damageDealt: 0, time: 0, bossesCleared: 0 };
    }

    bossIdForEncounter() {
      const o = this.opts;
      if (o.mode === 'rush') return C.bossOrder[this.rushIndex];
      if (o.mode === 'survival') return 'survival';
      if (o.mode === 'tutorial') return 'dummy';
      return o.boss;
    }

    beginEncounter() {
      const o = this.opts;
      this.diff = Object.assign({ id: o.difficulty }, C.difficulty[o.difficulty] || C.difficulty.normal);
      this.mods = o.modifiers || {};
      this.bpmMult = this.mods.doubleTime ? 1.15 : 1;
      this.damageMult = this.diff.bossDamageTaken * (this.mods.glass ? 1.5 : 1);
      this.scoreMult = this.diff.scoreMult;
      for (const k in this.mods) if (this.mods[k] && C.modifiers[k]) this.scoreMult *= C.modifiers[k].scoreMult;

      this.epoch++;
      this.hazards.list = [];
      this.fx.reset();
      this.cores = [];
      this.seq = null;
      this.res = this.carryRes || 0;
      this.slowT = 0; this.timeScale = 1; this.hitStop = 0;
      this.pulseOffset = 0;
      this.musicOff = false;
      this.announcement = null;

      const maxHp = this.mods.glass ? 1 : this.diff.playerHp;
      this.player = new PS.Player(this, this.W / 2, this.H * 0.8, maxHp);
      if (this.carryHp !== null) this.player.hp = Math.min(maxHp, this.carryHp);

      this.bossId = this.bossIdForEncounter();
      this.boss = new PS.Bosses[this.bossId](this);
      this.track = PS.Tracks[this.boss.track] || PS.Tracks.metronome;
      // start one bar early: a 4-beat count-in
      this.clock.reset(this.boss.bpms[0] * this.bpmMult, -4);
      this.clock.running = true;

      this.fightTime = 0;
      this.ghostRec = []; this.ghostT = 0;
      this.ghost = o.mode === 'practice' && PS.Profile.settings.ghost ? PS.Store.load('ghost.' + this.recordKey(), null) : null;
      this.tutorial = o.mode === 'tutorial' ? new PS.Tutorial(this) : null;

      this.state = 'playing';
      PS.Input.clear();
      this.setMuffle(0);
      const pre = o.mode === 'rush' ? 'BOSS ' + (this.rushIndex + 1) + '/3 — ' : '';
      this.announce(pre + this.boss.name, this.boss.subtitle, 2.4);
      this.startCustomAudio();
    }

    recordKey() {
      const o = this.opts;
      return o.mode + ':' + (o.mode === 'practice' ? o.boss : o.mode) + ':' + o.difficulty;
    }

    pause() {
      if (this.state !== 'playing') return;
      this.state = 'paused';
      this.clock.running = false;
      this.setMuffle(1);
      if (this.customAudio) this.customAudio.pause();
      PS.Menus.show('pause');
    }
    resume() {
      if (this.state !== 'paused') return;
      this.state = 'playing';
      this.clock.running = true;
      this.setMuffle(0);
      PS.Input.clear();
      if (this.customAudio && this.clock.beat >= 0) this.customAudio.play().catch(() => {});
      PS.Menus.hide();
    }
    restart() { PS.Menus.hide(); this.start(this.opts); }
    quit() { this.enterMenu(); PS.Menus.show('title'); }

    setMuffle(v) {
      if (this._muffle === v) return;
      this._muffle = v;
      PS.Audio.muffle(v);
    }

    // ================= CUSTOM SOUNDTRACK FILE =================
    startCustomAudio() {
      this.stopCustomAudio();
      if (!this.track.url) return;
      try {
        const a = new Audio(this.track.url);
        a.loop = true;
        a.volume = PS.Profile.settings.music;
        this.customAudio = a;
      } catch (e) { this.customAudio = null; }
    }
    stopCustomAudio() {
      if (this.customAudio) { try { this.customAudio.pause(); } catch (e) { /* ignore */ } }
      this.customAudio = null;
    }

    // ================= RHYTHM HELPERS (used by bosses) =================
    beats(n) { return n * this.clock.beatDur; }                 // beats -> seconds
    setBpm(bpm) { this.clock.setBpm(bpm * this.bpmMult); }
    // run fn after n beats — cancelled automatically on phase change/restart
    later(n, fn) {
      const ep = this.epoch;
      this.clock.after(n, () => { if (ep === this.epoch) fn(); });
    }
    visualPulse() {
      const b = this.clock.beat + this.pulseOffset;
      return Math.pow(1 - (b - Math.floor(b)), 3);
    }
    announce(title, sub, life = 2) { this.announcement = { title, sub: sub || '', t: 0, life }; }

    // called on every 16th note by the beat clock
    onStep(s) {
      if (!this.musicOff) this.playMusic(s);
      if (this.state !== 'playing' || !this.boss) return;
      if (s.step === 0 && this.customAudio) {
        try {
          this.customAudio.currentTime = this.track.offset || 0;
          this.customAudio.playbackRate = this.bpmMult;
          this.customAudio.play().catch(() => {});
        } catch (e) { /* ignore */ }
      }
      if (s.sub !== 0) return;
      const pal = PS.Profile.palette();
      if (s.bar < 0) { // count-in
        const n = 4 - s.beatInBar;
        if (n <= 3) this.fx.text(this.W / 2, this.H / 2 + 120, String(n), pal.ui, 46, 0.5);
        return;
      }
      if (s.step === 0) this.fx.text(this.W / 2, this.H / 2 + 120, 'GO', pal.accent, 54, 0.6);
      if (this.seq) return;
      this.boss.onBeat(s);
      if (this.tutorial) this.tutorial.onBeat(s);
      if (s.beatInBar === 0) this.onBar(s);
      this.addScore(5, true); // a few points for every beat survived
    }

    playMusic(s) {
      if (this.customAudio) return;
      const A = PS.Audio;
      if (!A.ctx || A.ctx.state !== 'running' || this.state === 'paused') return;
      const t = A.ctx.currentTime + 0.03 - Math.min(s.lag, 0.03);
      if (s.bar < 0 && this.state === 'playing') {
        if (s.sub === 0) A.tick(t, s.beatInBar === 0 ? 1760 : 1175, 0.7);
        return;
      }
      try { this.track.play(A, t, s, this.musicLayer()); } catch (e) { /* never let music crash the game */ }
    }

    musicLayer() {
      const b = this.boss;
      if (!b || this.state === 'menu') return 0;
      if (b.isSurvival) return Math.min(3, Math.floor((b.level - 1) / 2));
      if (b.isDummy) return 1;
      return b.phase === 2 ? 3 : b.phase;
    }

    onBar(s) {
      const every = C.cores.everyBars;
      if (!this.tutorial && s.bar >= 2 && (s.bar - 2) % every === 0) this.spawnCore();
    }

    // ================= BEAT CORES =================
    spawnCore(x, y) {
      const A = this.arena;
      let best = null;
      for (let i = 0; i < 24 && x === undefined; i++) {
        const px = U.rand(A.x0 + 70, A.x1 - 70), py = U.rand(A.y0 + 70, A.y1 - 70);
        const db = this.boss ? U.dist(px, py, this.boss.x, this.boss.y) : 999;
        const dp = U.dist(px, py, this.player.x, this.player.y);
        if (db > 200 && dp > 140 && dp < 520) { best = { x: px, y: py }; break; }
      }
      if (x !== undefined) best = { x, y };
      if (!best) best = { x: U.rand(A.x0 + 80, A.x1 - 80), y: A.y1 - 100 };
      this.cores.push({ x: best.x, y: best.y, age: 0, life: this.beats(C.cores.lifeBars * 4), r: C.cores.radius });
      this.fx.ring(best.x, best.y, '#ffe27a', 60, 10, 0.4, 2, 'hex');
    }

    updateCores(dt) {
      const p = this.player;
      for (const c of this.cores) {
        c.age += dt;
        if (p.alive && !this.seq && U.dist(c.x, c.y, p.x, p.y) < c.r + C.player.size + 4) { c.dead = true; this.collectCore(c); }
        if (c.age > c.life) c.dead = true;
      }
      this.cores = this.cores.filter((c) => !c.dead);
    }

    collectCore(c) {
      this.stats.cores++;
      this.addRes(C.resonance.core);
      this.comboUp();
      this.addScore(200);
      this.fx.spark(c.x, c.y, '#ffe27a', 18, 320, 0.5, 4, 'tri');
      this.fx.ring(c.x, c.y, '#ffe27a', 10, 70, 0.35, 3, 'hex');
      PS.Audio.sfx('core');
      const b = this.boss;
      if (b && !b.defeated) {
        const tp = b.targetPoint(c.x, c.y);
        this.fx.bolt(c.x, c.y, tp.x, tp.y, '#ffe27a', 0.35);
        b.takeDamage(C.bossDamage.core, tp.x, tp.y);
      }
      if (this.tutorial) this.tutorial.notify('core');
    }

    drawCores(ctx) {
      for (const c of this.cores) {
        const left = 1 - c.age / c.life;
        const pulse = this.visualPulse();
        const blink = left < 0.25 && Math.floor(this.realTime * 10) % 2 ? 0.4 : 1;
        const R = 46;
        ctx.globalAlpha = blink * (0.6 + pulse * 0.4);
        ctx.drawImage(PS.glow('#ffe27a', R), c.x - R, c.y - R);
        ctx.globalAlpha = blink;
        ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 3;
        PS.FX.shapePath(ctx, 'hex', c.x, c.y, c.r + pulse * 4, this.realTime * 2); ctx.stroke();
        ctx.fillStyle = '#ffffff';
        PS.FX.shapePath(ctx, 'hex', c.x, c.y, c.r * 0.45, -this.realTime * 3); ctx.fill();
        ctx.strokeStyle = U.rgba('#ffe27a', 0.5); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(c.x, c.y, c.r + 10, -Math.PI / 2, -Math.PI / 2 + left * U.TAU); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // ================= SCORING =================
    comboMult() {
      const cc = C.combo;
      return 1 + Math.min(Math.floor(this.stats.combo / cc.perStep) * cc.multPerStep, cc.maxMult - 1);
    }
    addScore(base, flat) {
      this.stats.score += Math.round(base * (flat ? 1 : this.comboMult()) * this.scoreMult);
    }
    comboUp() {
      const st = this.stats;
      const before = this.comboMult();
      st.combo++;
      st.maxCombo = Math.max(st.maxCombo, st.combo);
      const after = this.comboMult();
      if (after > before && this.player) this.fx.text(this.player.x, this.player.y - 64, '×' + after.toFixed(1), PS.Profile.palette().accent, 20, 0.7);
    }
    addRes(n) {
      const before = this.res;
      const cost = C.resonance.breakCost;
      this.res = Math.min(C.resonance.max, this.res + n);
      if (before < cost && this.res >= cost && this.player) {
        this.fx.text(this.player.x, this.player.y + 40, 'BREAK READY', C.hazardColors.breakable, 15, 0.8);
      }
    }

    // ================= PLAYER EVENTS =================
    onDash() {
      const p = this.player;
      this.stats.dashes++;
      this.fx.ring(p.x, p.y, PS.Profile.palette().player, 6, 30, 0.2, 2);
      PS.Audio.sfx('dash');
      if (this.tutorial) this.tutorial.notify('dash');
    }
    onHop() {
      const p = this.player;
      this.stats.hops++;
      this.fx.ring(p.x, p.y, C.hazardColors.ground, 10, 46, 0.3, 3);
      PS.Audio.sfx('hop');
      if (this.tutorial) this.tutorial.notify('hop');
    }

    perfectShift(h) {
      const p = this.player, pal = PS.Profile.palette();
      this.stats.perfects++;
      PS.Profile.data.lifetime.perfects++;
      this.addRes(C.resonance.perfectShift);
      this.comboUp();
      this.addScore(300);
      this.slowT = C.perfect.slowTime;
      p.dashCd = 0;                         // chain into another dash immediately
      p.overdrive = C.player.overdriveTime; // and move faster for a moment
      this.fx.text(p.x, p.y - 42, 'PERFECT SHIFT', pal.accent, 24, 0.85);
      this.fx.ring(p.x, p.y, pal.accent, 10, 140, 0.45, 5, 'hex', this.realTime);
      this.fx.ring(p.x, p.y, '#ffffff', 10, 80, 0.3, 3, 'square', Math.PI / 4);
      this.fx.spark(p.x, p.y, '#ffffff', 16, 420, 0.5, 3, 'tri');
      this.fx.flash(pal.accent, 0.14);
      this.fx.zoom = 1;
      this.fx.shake(3, 0.12);
      PS.Audio.sfx('perfect');
      // echo strike: a small free hit on the boss
      const b = this.boss;
      if (b && !b.isSurvival && !b.isDummy && !b.defeated) {
        const tp = b.targetPoint(p.x, p.y);
        this.fx.bolt(p.x, p.y, tp.x, tp.y, pal.accent, 0.3);
        b.takeDamage(C.bossDamage.perfectEcho, tp.x, tp.y);
      }
      if (this.tutorial) this.tutorial.notify('perfect');
    }

    perfectHop(h) {
      const p = this.player;
      this.stats.perfectHops++;
      this.addRes(C.resonance.perfectHop);
      this.comboUp();
      this.addScore(220);
      this.slowT = 0.1;
      this.fx.text(p.x, p.y - 42, 'PERFECT HOP', C.hazardColors.ground, 22, 0.8);
      this.fx.ring(p.x, p.y, C.hazardColors.ground, 10, 110, 0.4, 4, 'circle');
      this.fx.spark(p.x, p.y, '#ffffff', 10, 300, 0.4, 3);
      PS.Audio.sfx('perfectHop');
      if (this.tutorial) this.tutorial.notify('hopClear');
    }

    graze(h, ground) {
      const p = this.player;
      this.stats.grazes++;
      this.addRes(C.resonance.graze);
      this.addScore(40);
      this.fx.spark(p.x, p.y, ground ? C.hazardColors.ground : '#ffffff', 5, 200, 0.3, 2);
      PS.Audio.sfx('graze');
      if (ground && this.tutorial) this.tutorial.notify('hopClear');
    }

    tryBreak() {
      const p = this.player;
      if (!p || !p.alive || this.seq) return;
      const R = C.resonance;
      if (this.res < R.breakCost) {
        this.fx.text(p.x, p.y - 34, 'NEED 50 RESONANCE', '#9a9ab8', 14, 0.6);
        PS.Audio.sfx('deny');
        return;
      }
      this.res -= R.breakCost;
      this.stats.breaks++;
      p.breakInv = R.breakIFrames;
      let n = 0;
      for (const h of this.hazards.list) {
        if (h.type !== 'orb' || !h.breakable || h.friendly || !h.active()) continue;
        if (U.dist(h.x, h.y, p.x, p.y) > R.breakRadius) continue;
        // reverse it and send it home
        h.friendly = true;
        h.orbit = null; h.blink = null; h.redirect = null; h.accel = 0;
        let sp = h.speed();
        if (sp < 60) { const a = U.angle(p.x, p.y, h.x, h.y); h.vx = Math.cos(a) * 240; h.vy = Math.sin(a) * 240; }
        else { h.vx = -h.vx; h.vy = -h.vy; }
        h.life = h.age - h.delay + 3;
        n++;
      }
      const bc = C.hazardColors.breakable;
      this.fx.ring(p.x, p.y, bc, 20, R.breakRadius, 0.45, 6, 'hex', this.realTime);
      this.fx.ring(p.x, p.y, '#ffffff', 10, R.breakRadius * 0.7, 0.3, 2);
      this.fx.spark(p.x, p.y, bc, 26, 520, 0.5, 4, 'tri');
      this.fx.flash(bc, 0.2);
      this.fx.zoom = 0.7;
      this.fx.shake(6, 0.2);
      PS.Audio.sfx('break');
      this.fx.text(p.x, p.y - 44, n ? 'BREAK ×' + n : 'BREAK — no shards nearby', bc, n ? 24 : 15, 0.8);
      if (n) { this.comboUp(); this.addScore(50 * n); }
      if (this.tutorial) this.tutorial.notify('break', n);
    }

    onReflectHit(h) {
      this.stats.breakHits++;
      this.comboUp();
      this.addScore(120);
      this.fx.spark(h.x, h.y, C.hazardColors.friendly, 10, 300, 0.4, 3);
      this.fx.shake(2, 0.08);
      this.boss.takeDamage(C.bossDamage.reflected, h.x, h.y);
    }

    hurt() {
      const p = this.player, pal = PS.Profile.palette();
      p.hp--;
      this.stats.hits++;
      this.stats.combo = 0;
      p.hurtT = C.player.hurtIFrames * (this.diff.iframes || 1);
      this.hitStop = 0.1;
      this.fx.shake(14, 0.35);
      this.fx.flash(C.hazardColors.danger, 0.4);
      this.fx.spark(p.x, p.y, C.hazardColors.danger, 24, 420, 0.6, 4);
      this.fx.ring(p.x, p.y, C.hazardColors.danger, 10, 90, 0.4, 4);
      PS.Audio.sfx('hurt');
      // clear bullets right next to you so you can recover
      for (const h of this.hazards.list) {
        if (h.type === 'orb' && !h.friendly && U.dist(h.x, h.y, p.x, p.y) < 110) { h.dead = true; this.fx.spark(h.x, h.y, pal.ui, 3, 150, 0.3, 2); }
      }
      if (this.tutorial) { p.hp = p.maxHp; return; } // can't die in the tutorial
      if (p.hp <= 0) this.die();
    }

    die() {
      const p = this.player;
      p.alive = false;
      this.seq = { type: 'death', t: 0 };
      this.fx.spark(p.x, p.y, PS.Profile.palette().player, 50, 600, 1.2, 5, 'tri');
      this.fx.ring(p.x, p.y, '#ffffff', 10, 300, 1.0, 4, 'hex');
      this.fx.flash('#ffffff', 0.5);
      PS.Audio.sfx('death');
      this.musicOff = true;
      this.stopCustomAudio();
      this.announce('SIGNAL LOST', '', 2);
    }

    onBossDefeated(boss) {
      const pal = PS.Profile.palette();
      this.seq = { type: 'defeat', t: 0 };
      this.stats.bossesCleared++;
      let n = 0;
      for (const h of this.hazards.list) if (h.type === 'orb' && !h.friendly) n++;
      this.addScore(n * 10, true);
      this.hazards.clear(true);
      const pts = boss.fragments ? boss.fragments.concat([boss]) : [boss];
      for (const q of pts) {
        this.fx.spark(q.x, q.y, pal.boss, 40, 700, 1.4, 6, 'tri');
        this.fx.spark(q.x, q.y, '#ffffff', 30, 500, 1.0, 4);
      }
      this.fx.ring(boss.x, boss.y, '#ffffff', 20, 900, 1.4, 8, 'hex');
      this.fx.ring(boss.x, boss.y, pal.boss, 20, 600, 1.0, 5, 'oct');
      this.fx.flash('#ffffff', 0.8);
      this.fx.shake(18, 0.8);
      PS.Audio.sfx('defeat');
      this.musicOff = true;
      this.stopCustomAudio();
      this.announce('RESOLVED', boss.name + ' falls silent', 2.6);
    }

    // ================= COLLISIONS =================
    collide() {
      const p = this.player;
      if (!p.alive || this.seq) return;
      const pr = C.player.hitRadius;
      for (const h of this.hazards.list) {
        if (h.friendly) {
          if (h.type === 'orb' && h.active() && this.boss && this.boss.hitTest(h.x, h.y, h.r)) { h.dead = true; this.onReflectHit(h); }
          continue;
        }
        if (!h.active()) continue;
        let hit = h.hits(p.x, p.y, pr);
        if (!hit && p.dashing && h.hitsSeg) hit = h.hitsSeg(p.prevX, p.prevY, p.x, p.y, pr); // fast dash: swept test
        if (!hit) continue;

        if (h.layer === 'air' && p.airSafe()) {
          if (!h.grazed && !h.noPerfect) {
            h.grazed = true;
            if (p.dashing && p.dashT <= C.player.perfectWindow && !p.perfectDone) { p.perfectDone = true; this.perfectShift(h); } // max one per dash
            else this.graze(h, false);
          }
          continue;
        }
        if (h.layer === 'ground' && p.groundSafe()) {
          if (!h.grazed) {
            h.grazed = true;
            if (p.hopT <= C.player.perfectHopWindow) this.perfectHop(h); else this.graze(h, true);
          }
          continue;
        }
        // dashing also carries you safely through floor waves
        // (but only a hop can score a PERFECT HOP on them)
        if (h.layer === 'ground' && p.airSafe()) {
          if (!h.grazed) { h.grazed = true; this.graze(h, true); }
          continue;
        }
        if (p.hurtSafe()) continue;
        this.hurt(h);
        return;
      }
      if (!p.hurtSafe() && !p.airSafe() && this.boss && this.boss.bodyHits(p.x, p.y, pr)) this.hurt(null);
    }

    // ================= MAIN UPDATE =================
    update(dt) {
      this.realTime += dt;
      PS.Input.update(dt);
      if (this.state === 'paused') return;
      this.clock.update(dt);
      if (this.state !== 'playing') { this.fx.update(dt, dt); return; }

      if (this.hitStop > 0) { this.hitStop -= dt; this.fx.update(0, dt); return; } // impact freeze

      // time dilation (Perfect Shift, death, boss defeat)
      this.slowT -= dt;
      let target = this.slowT > 0 ? C.perfect.slowScale : 1;
      if (this.seq && this.seq.type === 'death') target = 0.35;
      if (this.seq && this.seq.type === 'defeat') target = this.seq.t < 1.2 ? 0.3 : 1;
      this.timeScale += (target - this.timeScale) * Math.min(1, dt * (target < this.timeScale ? 40 : 8));
      this.setMuffle(this.timeScale < 0.6 && !this.seq ? 0.45 : 0);

      const sdt = dt * this.timeScale;
      const pdt = dt * Math.max(this.timeScale, 0.65); // you stay quick while the world slows

      const p = this.player;
      if (p.alive) p.update(pdt);
      const fighting = !this.seq && this.clock.beat >= 0;
      if (fighting) { this.fightTime += dt; this.stats.time += dt; }
      this.boss.update(sdt);
      this.hazards.update(sdt);
      this.updateCores(sdt);
      this.collide();
      this.fx.update(sdt, dt);
      if (this.tutorial) this.tutorial.update(dt);
      if (this.announcement) { this.announcement.t += dt; if (this.announcement.t > this.announcement.life) this.announcement = null; }

      // record a ghost of this run (20 samples per second)
      if (fighting && p.alive) {
        this.ghostT += dt;
        while (this.ghostT >= 0.05) { this.ghostT -= 0.05; this.ghostRec.push(Math.round(p.x), Math.round(p.y)); }
      }

      if (this.seq) {
        this.seq.t += dt;
        if (this.seq.type === 'death' && this.seq.t > 1.8) this.finishRun(false);
        else if (this.seq.type === 'defeat' && this.seq.t > 3.2) {
          if (this.opts.mode === 'rush' && this.rushIndex < C.bossOrder.length - 1) this.nextRushBoss();
          else this.finishRun(true);
        }
      }
    }

    nextRushBoss() {
      this.rushIndex++;
      this.carryHp = this.player.hp + 1; // small heal between bosses
      this.carryRes = this.res;
      this.beginEncounter();
    }

    // ================= RESULTS =================
    finishRun(cleared) {
      const res = this.computeResults(cleared);
      this.saveResults(res);
      this.state = 'results';
      this.hazards.list = []; this.cores = [];
      this.musicOff = false;
      this.track = PS.Tracks.menu;
      this.bpmMult = 1;
      this.clock.reset(this.track.bpm, 0);
      this.clock.running = true;
      this.stopCustomAudio();
      PS.Menus.showResults(res);
    }

    computeResults(cleared) {
      const st = this.stats, o = this.opts;
      const acc = st.dashes ? st.perfects / st.dashes : 0;
      let rank = null, points = 0;
      let score = st.score;
      if (o.mode === 'survival') {
        const t = st.time;
        rank = t >= 300 ? 'S+' : t >= 210 ? 'S' : t >= 140 ? 'A' : t >= 80 ? 'B' : 'C';
      } else if (cleared) {
        points = 40 + Math.min(1, acc / 0.35) * 20 + Math.max(0, 30 - st.hits * 8) + (Math.min(st.breakHits, 20) / 20) * 10 + (Math.min(st.maxCombo, 30) / 30) * 10;
        rank = points >= 100 && st.hits === 0 ? 'S+' : points >= 88 ? 'S' : points >= 74 ? 'A' : points >= 58 ? 'B' : 'C';
        score += Math.round((5000 * st.bossesCleared + 600 * this.player.hp) * this.scoreMult);
      }
      return {
        mode: o.mode, cleared, rank, points: Math.round(points), score,
        title: o.mode === 'survival' ? 'SURVIVAL' : o.mode === 'rush' ? 'BOSS RUSH' : this.boss.name,
        difficulty: this.diff.label, mods: Object.keys(this.mods).filter((k) => this.mods[k]).map((k) => C.modifiers[k].label),
        time: st.time, accuracy: acc, perfects: st.perfects, dashes: st.dashes, perfectHops: st.perfectHops,
        hits: st.hits, breaks: st.breaks, breakHits: st.breakHits, maxCombo: st.maxCombo, cores: st.cores,
        level: this.boss && this.boss.isSurvival ? this.boss.level : 0,
        progress: this.boss && !this.boss.isSurvival ? Math.round((1 - this.boss.hp / this.boss.maxHp) * 100) : 0,
        bossesCleared: st.bossesCleared, unlocks: [], newBest: false, prevBest: null
      };
    }

    saveResults(res) {
      const prof = PS.Profile.data;
      const key = this.recordKey();
      const prev = prof.records[key];
      res.prevBest = prev ? prev.score : null;
      if (!prev || res.score > prev.score) {
        res.newBest = true;
        const bestRank = prev && prev.rank && (!res.rank || PS.rankValue(prev.rank) > PS.rankValue(res.rank)) ? prev.rank : res.rank;
        prof.records[key] = { score: res.score, rank: bestRank || (prev && prev.rank) || null, time: res.time, cleared: res.cleared || (prev && prev.cleared) || false };
        if (this.opts.mode === 'practice' && res.cleared) PS.Store.save('ghost.' + key, this.ghostRec);
      } else if (res.rank && (!prev.rank || PS.rankValue(res.rank) > PS.rankValue(prev.rank))) {
        prev.rank = res.rank;
      }
      if (res.cleared) prof.lifetime.clears++;

      // achievements -> unlocks
      const before = Object.assign({}, prof.flags);
      const F = prof.flags;
      const rv = res.rank ? PS.rankValue(res.rank) : -1;
      if (res.mode !== 'survival') {
        if (res.cleared || res.bossesCleared > 0) F.clearAny = true;
        if ((res.cleared || res.bossesCleared > 0) && this.diff.id === 'hard') F.clearHard = true;
        if (res.cleared && rv >= 2) F.rankA = true;
        if (res.cleared && rv >= 3) F.rankS = true;
        if (res.cleared && rv >= 4) F.rankSPlus = true;
        if (res.mode === 'rush' && res.cleared) F.clearRush = true;
      } else if (res.time >= 120) F.survive120 = true;
      if (prof.lifetime.perfects >= 30) F.perfects30 = true;
      res.unlocks = PS.Game.newUnlocks(before, F);
      PS.Profile.save();
    }

    // ================= DRAWING =================
    draw() {
      const ctx = this.ctx, pal = PS.Profile.palette();
      const s = this.canvas.width / this.W;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      const sh = this.fx.shakeOffset();
      const z = 1 + this.fx.zoom * 0.025;
      const fx = this.player ? this.player.x : this.W / 2, fy = this.player ? this.player.y : this.H / 2;
      ctx.setTransform(s * z, 0, 0, s * z, (sh.x + (1 - z) * fx) * s, (sh.y + (1 - z) * fy) * s);

      this.drawBackground(ctx, pal);
      if (this.boss && (this.state === 'playing' || this.state === 'paused')) {
        this.drawCores(ctx);
        this.boss.draw(ctx);
        this.hazards.draw(ctx);
        this.drawGhost(ctx);
        this.player.draw(ctx);
      } else {
        this.drawMenuBackdrop(ctx, pal);
      }
      this.fx.drawWorld(ctx);
      this.fx.drawTexts(ctx);

      ctx.setTransform(s, 0, 0, s, 0, 0);
      if (this.boss && (this.state === 'playing' || this.state === 'paused')) PS.HUD.draw(ctx, this);
      this.fx.drawFlash(ctx, this.W, this.H);
    }

    drawBackground(ctx, pal) {
      const A = this.arena, W = this.W, H = this.H;
      const pulse = this.visualPulse();
      if (!this._bg || this._bg.name !== pal.name) {
        const g = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.7);
        g.addColorStop(0, pal.bg2); g.addColorStop(1, pal.bg);
        this._bg = { name: pal.name, grad: g };
      }
      ctx.fillStyle = this._bg.grad;
      ctx.fillRect(0, 0, W, H);

      // grid pulses on every beat
      ctx.strokeStyle = U.rgba(pal.grid, 0.3 + pulse * 0.4);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = A.x0; x <= A.x1; x += 64) { ctx.moveTo(x, A.y0); ctx.lineTo(x, A.y1); }
      for (let y = A.y0; y <= A.y1; y += 64) { ctx.moveTo(A.x0, y); ctx.lineTo(A.x1, y); }
      ctx.stroke();

      // soft ripple from the centre each beat (decoration only — very faint)
      const b = this.clock.beat + this.pulseOffset, f = b - Math.floor(b);
      const cx = this.boss ? this.boss.x : W / 2, cy = this.boss ? this.boss.y : H / 2;
      ctx.strokeStyle = U.rgba(pal.grid, (1 - f) * 0.5);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, 60 + f * 700, 0, U.TAU); ctx.stroke();

      // arena border
      ctx.strokeStyle = U.rgba(pal.player, 0.25 + pulse * 0.45);
      ctx.lineWidth = 2 + pulse * 2;
      ctx.strokeRect(A.x0, A.y0, A.x1 - A.x0, A.y1 - A.y0);
      // corner brackets
      ctx.strokeStyle = U.rgba(pal.accent, 0.8); ctx.lineWidth = 3;
      const L = 26 + pulse * 6;
      [[A.x0, A.y0, 1, 1], [A.x1, A.y0, -1, 1], [A.x0, A.y1, 1, -1], [A.x1, A.y1, -1, -1]].forEach(([x, y, sx, sy]) => {
        ctx.beginPath(); ctx.moveTo(x, y + sy * L); ctx.lineTo(x, y); ctx.lineTo(x + sx * L, y); ctx.stroke();
      });
    }

    // rotating shapes behind the menus
    drawMenuBackdrop(ctx, pal) {
      const pulse = this.visualPulse(), t = this.realTime;
      const cx = this.W / 2, cy = this.H / 2;
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.drawImage(PS.glow(pal.boss, 300), cx - 300, cy - 300);
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2;
      const shapes = [['oct', 260, 0.08, pal.boss], ['hex', 200, -0.12, pal.boss2], ['tri', 140, 0.2, pal.accent], ['square', 330, -0.05, pal.grid]];
      for (const [sh, r, sp, c] of shapes) {
        ctx.strokeStyle = U.rgba(c, 0.35 + pulse * 0.3);
        PS.FX.shapePath(ctx, sh, cx, cy, r + pulse * 8, t * sp);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawGhost(ctx) {
      if (!this.ghost || this.opts.mode !== 'practice') return;
      const i = Math.floor(this.fightTime / 0.05) * 2;
      if (i + 1 >= this.ghost.length) return;
      const x = this.ghost[i], y = this.ghost[i + 1];
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
      PS.FX.shapePath(ctx, 'square', x, y, 11, Math.PI / 4); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = '700 9px ' + PS.FONT; ctx.textAlign = 'center';
      ctx.fillText('BEST', x, y - 16);
    }
  };

  // which palettes / trails just became unlocked
  PS.Game.newUnlocks = function (before, after) {
    const out = [];
    const check = (items, kind) => {
      for (const id in items) {
        const u = items[id].unlock;
        if (u && after[u.id] && !before[u.id]) out.push(kind + ': ' + items[id].name);
      }
    };
    check(C.palettes, 'Palette');
    check(C.trails, 'Trail');
    return out;
  };
})();
