// =============================================================
//  TUTORIAL — a short interactive lesson against a training dummy.
//  Each step has text, an optional attack on the beat, and a goal.
// =============================================================
PS.Tutorial = class {
  constructor(g) {
    this.g = g;
    this.count = {};
    this.moved = 0;
    this.lastPos = { x: g.player.x, y: g.player.y };
    this.i = 0;
    this.doneT = 0;
    this.finished = false;
    const P = PS.Patterns;
    const boss = () => g.boss;
    this.steps = [
      { title: 'MOVE', text: 'Move with WASD or the arrow keys. Get a feel for it.', goal: () => this.moved / 12, need: 50 },
      { title: 'DASH', text: 'Press SPACE / J / Z to dash where you are moving. Dashes are quick and short.', goal: () => this.c('dash'), need: 4 },
      {
        title: 'PERFECT SHIFT',
        text: 'PINK means danger. Dash THROUGH a pink orb just as it reaches you — not early. It slows time, recharges your dash and builds Resonance.',
        goal: () => this.c('perfect'), need: 2,
        beat: (s) => { if (s.beatInBar % 2 === 0) P.aimed(g, boss(), { count: 3, speed: 210, spread: 0.12 }); }
      },
      {
        title: 'PULSE HOP',
        text: 'VIOLET waves travel along the floor. You can dash through them, but HOP over them (K / X / SHIFT) right as they arrive for a PERFECT HOP and Resonance.',
        goal: () => this.c('hopClear'), need: 3,
        beat: (s) => { if (s.beatInBar === 0) P.shockwave(g, boss().x, boss().y, { warnBeats: 1, speed: 260, gaps: [] }); }
      },
      {
        title: 'BEAT CORES',
        text: 'Golden cores appear during fights. Grab them: each one strikes the boss and gives Resonance.',
        goal: () => this.c('core'), need: 2,
        start: () => g.spawnCore(),
        beat: (s) => { if (s.beatInBar === 0 && g.cores.length === 0) g.spawnCore(); }
      },
      {
        title: 'BREAK',
        text: 'CYAN hollow diamonds can be reversed. With 50+ Resonance press L / C / E near them to fling them back. Hit the prism 5 times.',
        goal: () => this.c('bossHit'), need: 5,
        start: () => { g.res = Math.max(g.res, 100); },
        beat: (s) => {
          if (s.beatInBar === 0) {
            P.ring(g, boss().x, boss().y, { count: 10, speed: 110, breakable: true });
            if (g.res < 50) g.res = 50;
          }
        }
      },
      {
        title: 'READY',
        text: 'Perfect Shifts, Perfect Hops and Breaks raise your combo multiplier. Getting hit resets it. Dash once more to finish.',
        goal: () => this.c('dash') - this.dashAtEnd, need: 1,
        start: () => { this.dashAtEnd = this.c('dash'); }
      }
    ];
    this.steps[0].start && this.steps[0].start();
  }

  c(k) { return this.count[k] || 0; }
  notify(kind) { this.count[kind] = this.c(kind) + 1; }
  onBossHit() { this.notify('bossHit'); }
  get step() { return this.steps[this.i]; }

  onBeat(s) {
    if (this.doneT > 0 || this.finished) return;
    if (this.step.beat) this.step.beat(s);
  }

  update(dt) {
    const p = this.g.player;
    this.moved += Math.hypot(p.x - this.lastPos.x, p.y - this.lastPos.y);
    this.lastPos = { x: p.x, y: p.y };
    if (this.finished) return;
    if (this.doneT > 0) {
      this.doneT -= dt;
      if (this.doneT <= 0) this.advance();
      return;
    }
    if (this.step.goal() >= this.step.need) {
      this.doneT = 1.0;
      PS.Audio.sfx('unlock');
      this.g.fx.text(this.g.W / 2, this.g.H - 190, 'NICE!', PS.Profile.palette().accent, 30, 0.9);
    }
  }

  advance() {
    this.g.hazards.clear(true);
    if (this.i >= this.steps.length - 1) { this.finish(); return; }
    this.i++;
    if (this.step.start) this.step.start();
  }

  finish() {
    this.finished = true;
    const prof = PS.Profile.data;
    const before = Object.assign({}, prof.flags);
    prof.flags.tutorial = true;
    const unlocks = PS.Game.newUnlocks(before, prof.flags);
    PS.Profile.save();
    this.g.enterMenu();
    PS.Menus.show('modes');
    PS.Menus.toast('Tutorial complete!' + (unlocks.length ? ' Unlocked ' + unlocks.join(', ') : ''));
  }

  draw(ctx) {
    const g = this.g, pal = PS.Profile.palette(), s = this.step;
    const w = 760, h = 92, x = (g.W - w) / 2, y = g.H - 160;
    ctx.save();
    ctx.fillStyle = 'rgba(6,4,16,0.82)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = PS.U.rgba(pal.accent, 0.6); ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.font = '800 15px ' + PS.FONT;
    ctx.fillStyle = pal.accent;
    ctx.fillText((this.i + 1) + '/' + this.steps.length + '  ' + s.title, x + 18, y + 12);
    ctx.textAlign = 'right';
    const prog = Math.min(s.need, Math.floor(s.goal()));
    ctx.fillStyle = pal.ui;
    ctx.fillText(s.need > 1 ? prog + ' / ' + s.need : '', x + w - 18, y + 12);
    ctx.textAlign = 'left';
    ctx.font = '500 14px ' + PS.FONT;
    ctx.fillStyle = pal.ui;
    // simple word wrap
    const words = s.text.split(' ');
    let line = '', ly = y + 38;
    for (const wd of words) {
      const test = line ? line + ' ' + wd : wd;
      if (ctx.measureText(test).width > w - 36 && line) { ctx.fillText(line, x + 18, ly); line = wd; ly += 20; }
      else line = test;
    }
    ctx.fillText(line, x + 18, ly);
    ctx.restore();
  }
};
