// =============================================================
//  MENUS — HTML overlay screens (title, mode select, setup,
//  customize, settings, records, pause, results).
//  Every button has data-act="..." which is handled in act().
//  Keyboard: arrow keys move between buttons, Enter presses, Esc goes back.
// =============================================================
PS.Menus = {
  root: null,
  current: null,
  mode: 'practice',
  sel: { boss: 'metronome', difficulty: 'normal', modifiers: {} },
  settingsBack: 'title',
  confirmReset: false,

  BOSS_INFO: {
    metronome: { name: 'THE METRONOME', sub: 'Keeper of the Tempo', desc: 'A giant gear that owns the tempo. Shockwaves, a swinging needle laser, turning walls — then it fractures.', shape: 'oct' },
    seraph:    { name: 'STATIC SERAPH', sub: 'Architect of the Lattice', desc: 'A crystal that rewrites space. Laser grids, teleporting bullets, fake-outs and a drifting safe zone.', shape: 'diamond' },
    offbeat:   { name: 'THE OFFBEAT',   sub: 'Thief of the Downbeat', desc: 'Strikes between the beats, fakes its wind-ups and bends the tempo. Trust the markers, not the music.', shape: 'star' }
  },

  init() {
    this.root = document.getElementById('ui');
    this.toastEl = document.getElementById('toast');
    this.root.addEventListener('click', (e) => {
      const el = e.target.closest('[data-act]');
      if (!el || el.disabled) return;
      PS.Audio.init();
      PS.Audio.sfx('ui');
      this.act(el.dataset.act, el.dataset);
    });
    document.addEventListener('keydown', (e) => this.onKey(e));
  },

  show(name) {
    this.current = name;
    this.root.innerHTML = '<div class="screen screen-' + name + '">' + this['screen_' + name]() + '</div>';
    this.root.classList.add('open');
    const first = this.root.querySelector('[data-focus]') || this.root.querySelector('button:not([disabled])');
    if (first) first.focus();
  },

  // redraw the current screen but keep keyboard focus where it was
  refresh() {
    const btns = this.buttons();
    const idx = btns.indexOf(document.activeElement);
    this.show(this.current);
    const nb = this.buttons();
    if (idx >= 0 && nb[idx]) nb[idx].focus();
  },

  hide() {
    this.current = null;
    this.root.classList.remove('open');
    this.root.innerHTML = '';
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  },

  buttons() { return Array.from(this.root.querySelectorAll('button:not([disabled])')); },

  toast(msg) {
    if (!this.toastEl) return;
    this.toastEl.textContent = msg;
    this.toastEl.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => this.toastEl.classList.remove('show'), 3500);
  },

  onKey(e) {
    if (!this.current) return;
    const typing = e.target && e.target.tagName === 'INPUT';
    if (typing && e.code === 'Enter' && e.target.dataset.enter) { e.preventDefault(); this.act(e.target.dataset.enter, {}); return; }
    if (typing && e.code !== 'Escape') return;
    const btns = this.buttons();
    const i = btns.indexOf(document.activeElement);
    if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'KeyS', 'KeyW', 'KeyA', 'KeyD'].includes(e.code)) {
      e.preventDefault();
      if (!btns.length) return;
      const fwd = ['ArrowDown', 'ArrowRight', 'KeyS', 'KeyD'].includes(e.code);
      const n = i < 0 ? 0 : (i + (fwd ? 1 : -1) + btns.length) % btns.length;
      btns[n].focus();
      PS.Audio.sfx('ui', { high: true });
    } else if (e.code === 'Escape' && this.current !== 'pause') {
      e.preventDefault();
      this.back();
    }
  },

  back() {
    if (this.current === 'coop') { PS.Net.leave(); this.show('modes'); return; }
    const map = { modes: 'title', setup: 'modes', customize: 'title', records: 'title', settings: this.settingsBack };
    const to = map[this.current];
    if (to) this.show(to);
  },

  act(a, d) {
    const g = PS.game, S = PS.Profile.settings;
    switch (a) {
      case 'nav': this.show(d.to); break;
      case 'tutorial': this.hide(); g.start({ mode: 'tutorial', difficulty: 'normal' }); break;
      case 'mode': this.mode = d.mode; this.show('setup'); break;
      case 'boss': this.sel.boss = d.id; this.refresh(); break;
      case 'diff': this.sel.difficulty = d.id; this.refresh(); break;
      case 'mod': this.sel.modifiers[d.id] = !this.sel.modifiers[d.id]; this.refresh(); break;
      case 'start':
        this.hide();
        g.start({ mode: this.mode, boss: this.sel.boss, difficulty: this.sel.difficulty, modifiers: Object.assign({}, this.sel.modifiers) });
        break;
      case 'palette': S.palette = d.id; PS.Profile.save(); this.refresh(); break;
      case 'trail': S.trail = d.id; PS.Profile.save(); this.refresh(); break;
      case 'set': {
        let v = d.val;
        if (v === 'true') v = true; else if (v === 'false') v = false; else if (!isNaN(parseFloat(v))) v = parseFloat(v);
        S[d.key] = v; PS.Profile.save(); PS.Audio.applyVolumes(); this.refresh();
        break;
      }
      case 'vol': {
        S[d.key] = Math.round(PS.U.clamp(S[d.key] + parseFloat(d.delta), 0, 1) * 10) / 10;
        PS.Profile.save(); PS.Audio.applyVolumes(); this.refresh();
        break;
      }
      case 'settings': this.settingsBack = d.back || 'title'; this.show('settings'); break;
      case 'back': this.back(); break;
      case 'resume': g.resume(); break;
      case 'restart': g.restart(); break;
      case 'quit': g.quit(); break;
      case 'retry': if (g.opts && g.opts.mode === 'coop' && PS.Net.status !== 'idle') { g.enterMenu(); this.show('coop'); } else g.restart(); break;
      case 'menu': g.quit(); break;
      // ---------- co-op ----------
      case 'coop': this.show('coop'); break;
      case 'coop-host': case 'coop-join': {
        const nameEl = document.getElementById('coop-name');
        const name = nameEl ? nameEl.value.trim() : PS.Net.me().name;
        if (!name) { this.toast('Type your name first.'); if (nameEl) nameEl.focus(); break; }
        PS.Net.setName(name);
        if (a === 'coop-host') { PS.Net.open(PS.Net.newCode(), 'host'); break; }
        const codeEl = document.getElementById('coop-code');
        const code = codeEl ? codeEl.value.trim().toUpperCase() : '';
        if (code.length !== 4) { this.toast('Room codes have 4 letters.'); if (codeEl) codeEl.focus(); break; }
        PS.Net.open(code, 'guest');
        break;
      }
      case 'coop-boss': PS.Net.lobby.boss = d.id; PS.Net.sendLobby(); this.refresh(); break;
      case 'coop-diff': PS.Net.lobby.difficulty = d.id; PS.Net.sendLobby(); this.refresh(); break;
      case 'coop-start': PS.Net.hostStart(); break;
      case 'coop-leave': PS.Net.leave().then(() => this.show('coop')); break;
      case 'reset':
        if (!this.confirmReset) { this.confirmReset = true; this.refresh(); break; }
        this.confirmReset = false;
        try { for (const k of Object.keys(localStorage)) if (k.indexOf(PS.Store.prefix) === 0) localStorage.removeItem(k); } catch (e) { /* ignore */ }
        PS.Profile.load(); PS.Audio.applyVolumes();
        this.toast('Progress reset.');
        this.refresh();
        break;
    }
  },

  // ---------------- screens ----------------
  screen_title() {
    const tut = PS.Profile.data.flags.tutorial;
    return `
      <div class="logo">PULSE<span>//</span>SHIFT</div>
      <div class="tag">dash through the beat · hop the floor · break it back</div>
      <div class="menu-col">
        <button data-act="nav" data-to="modes" ${tut ? 'data-focus' : ''}>Play</button>
        <button data-act="tutorial" ${tut ? '' : 'data-focus'}>Tutorial ${tut ? '' : '<em>start here</em>'}</button>
        <button data-act="nav" data-to="customize">Customize</button>
        <button data-act="nav" data-to="records">Records</button>
        <button data-act="settings" data-back="title">Settings</button>
      </div>
      ${this.controlsHtml()}
      <div class="hint">Arrow keys + Enter, or mouse · Controller supported in game</div>
      <div class="hint">v${PS.BUILD.version}${PS.BUILD.env === 'staging' ? ' · staging (separate save)' : ''}</div>
      ${PS.BUILD.home ? '<a class="home" href="' + PS.BUILD.home + '">← Bas Games</a>' : ''}`;
  },

  controlsHtml() {
    return `<div class="controls">
      <span><b>MOVE</b> WASD / Arrows</span>
      <span><b class="c-dash">DASH</b> Space / J / Z</span>
      <span><b class="c-hop">HOP</b> K / X / Shift</span>
      <span><b class="c-brk">BREAK</b> L / C / E</span>
      <span><b>PAUSE</b> Esc</span></div>`;
  },

  screen_modes() {
    const card = (mode, title, desc) => `<button class="card" data-act="mode" data-mode="${mode}"><h3>${title}</h3><p>${desc}</p></button>`;
    return `
      <h2>Choose a mode</h2>
      <div class="cards">
        ${card('practice', 'Practice', 'Fight one boss. Choose difficulty and modifiers. Race the ghost of your best run.')}
        ${card('survival', 'Survival', 'Endless waves from THE GRID. The tempo rises every 8 bars. How long can you last?')}
        ${card('rush', 'Boss Rush', 'All three bosses back to back. Health and Resonance carry over (+1 HP between fights).')}
        <button class="card" data-act="coop"><h3>Co-op · Deathlink</h3><p>Play online with a friend against the same boss. Damage is shared. If one of you goes down, you both do.</p></button>
      </div>
      <button class="back" data-act="back">← Back</button>`;
  },

  screen_setup() {
    const C = PS.CONFIG, rec = PS.Profile.data.records, sel = this.sel;
    let bosses = '';
    if (this.mode === 'practice') {
      bosses = '<h4>Boss</h4><div class="cards">' + C.bossOrder.map((id) => {
        const b = this.BOSS_INFO[id];
        const r = rec['practice:' + id + ':' + sel.difficulty];
        return `<button class="card boss ${sel.boss === id ? 'on' : ''}" data-act="boss" data-id="${id}">
          <div class="bossicon ${b.shape}"></div><h3>${b.name}</h3><div class="sub">${b.sub}</div><p>${b.desc}</p>
          <div class="pb">${r ? 'Best: <b>' + (r.rank || '—') + '</b> · ' + r.score.toLocaleString() : 'Not cleared yet'}</div></button>`;
      }).join('') + '</div>';
    } else {
      const r = rec[this.mode + ':' + this.mode + ':' + sel.difficulty];
      bosses = `<p class="modedesc">${this.mode === 'survival' ? 'Survive endless rhythm waves. Score and rank are based on time survived.' : 'METRONOME → STATIC SERAPH → THE OFFBEAT, back to back.'}</p>
        <div class="pb center">${r ? 'Personal best: <b>' + (r.rank || '—') + '</b> · ' + r.score.toLocaleString() + ' · ' + PS.U.formatTime(r.time) : 'No record yet'}</div>`;
    }
    const diffs = Object.keys(C.difficulty).map((id) => `<button class="pill ${sel.difficulty === id ? 'on' : ''}" data-act="diff" data-id="${id}">${C.difficulty[id].label}</button>`).join('');
    const mods = Object.keys(C.modifiers).map((id) => {
      const m = C.modifiers[id];
      return `<button class="pill mod ${sel.modifiers[id] ? 'on' : ''}" data-act="mod" data-id="${id}"><b>${m.label}</b><small>${m.desc} (score ×${m.scoreMult})</small></button>`;
    }).join('');
    const title = { practice: 'Practice', survival: 'Survival', rush: 'Boss Rush' }[this.mode];
    return `
      <h2>${title}</h2>
      ${bosses}
      <h4>Difficulty</h4><div class="row">${diffs}</div>
      <div class="smallnote">Easy: 9 HP, much slower &amp; fewer bullets, bosses take more damage. Hard: less HP, faster &amp; denser. Telegraph timing never changes.</div>
      <h4>Modifiers</h4><div class="row mods">${mods}</div>
      <div class="row"><button class="big" data-act="start" data-focus>Start ▶</button></div>
      <button class="back" data-act="back">← Back</button>`;
  },

  screen_customize() {
    const C = PS.CONFIG, S = PS.Profile.settings;
    const pals = Object.keys(C.palettes).map((id) => {
      const p = C.palettes[id], ok = PS.Profile.isUnlocked(p);
      return `<button class="swatch ${S.palette === id ? 'on' : ''}" data-act="palette" data-id="${id}" ${ok ? '' : 'disabled'}>
        <span class="dots" style="background:${p.bg}"><i style="background:${p.player}"></i><i style="background:${p.boss}"></i><i style="background:${p.accent}"></i></span>
        <b>${p.name}</b><small>${ok ? (S.palette === id ? 'equipped' : 'unlocked') : '🔒 ' + p.unlock.text}</small></button>`;
    }).join('');
    const trails = Object.keys(C.trails).map((id) => {
      const t = C.trails[id], ok = PS.Profile.isUnlocked(t);
      return `<button class="swatch ${S.trail === id ? 'on' : ''}" data-act="trail" data-id="${id}" ${ok ? '' : 'disabled'}>
        <b>${t.name}</b><small>${ok ? (S.trail === id ? 'equipped' : 'unlocked') : '🔒 ' + t.unlock.text}</small></button>`;
    }).join('');
    return `<h2>Customize</h2>
      <h4>Colour palette</h4><div class="grid">${pals}</div>
      <h4>Dash trail</h4><div class="grid">${trails}</div>
      <div class="smallnote">Hazard colours never change: pink = dash, violet = hop, cyan diamond = breakable.</div>
      <button class="back" data-act="back">← Back</button>`;
  },

  screen_settings() {
    const S = PS.Profile.settings;
    const opt = (key, val, label) => `<button class="pill ${S[key] === val ? 'on' : ''}" data-act="set" data-key="${key}" data-val="${val}">${label}</button>`;
    const vol = (key) => `<button class="pill" data-act="vol" data-key="${key}" data-delta="-0.1">−</button><span class="val">${Math.round(S[key] * 100)}%</span><button class="pill" data-act="vol" data-key="${key}" data-delta="0.1">+</button>`;
    return `<h2>Settings</h2>
      <div class="settings">
        <label>Screen shake</label><div class="row">${opt('shake', 0, 'Off')}${opt('shake', 0.5, 'Low')}${opt('shake', 1, 'Full')}</div>
        <label>Flashes</label><div class="row">${opt('flashes', true, 'Full')}${opt('flashes', false, 'Reduced')}</div>
        <label>Music volume</label><div class="row">${vol('music')}</div>
        <label>Effects volume</label><div class="row">${vol('sfx')}</div>
        <label>Ghost of best run</label><div class="row">${opt('ghost', true, 'On')}${opt('ghost', false, 'Off')}</div>
        <label>Show hitbox</label><div class="row">${opt('hitbox', true, 'On')}${opt('hitbox', false, 'Off')}</div>
        <label>Progress</label><div class="row"><button class="pill danger" data-act="reset">${this.confirmReset ? 'Click again to erase everything' : 'Reset all progress'}</button></div>
      </div>
      <button class="back" data-act="back" data-focus>← Back</button>`;
  },

  screen_records() {
    const C = PS.CONFIG, rec = PS.Profile.data.records, L = PS.Profile.data.lifetime;
    const diffs = Object.keys(C.difficulty);
    const cell = (key) => { const r = rec[key]; return r ? `<td><b>${r.rank || '—'}</b><small>${r.score.toLocaleString()}</small></td>` : '<td class="none">—</td>'; };
    let rows = '';
    for (const id of C.bossOrder) rows += `<tr><th>${this.BOSS_INFO[id].name}</th>${diffs.map((d) => cell('practice:' + id + ':' + d)).join('')}</tr>`;
    rows += `<tr><th>BOSS RUSH</th>${diffs.map((d) => cell('rush:rush:' + d)).join('')}</tr>`;
    rows += `<tr><th>SURVIVAL</th>${diffs.map((d) => { const r = rec['survival:survival:' + d]; return r ? `<td><b>${r.rank}</b><small>${PS.U.formatTime(r.time)}</small></td>` : '<td class="none">—</td>'; }).join('')}</tr>`;
    return `<h2>Records</h2>
      <table class="records"><tr><th></th>${diffs.map((d) => '<th>' + C.difficulty[d].label + '</th>').join('')}</tr>${rows}</table>
      <div class="smallnote">Runs: ${L.runs} · Clears: ${L.clears} · Lifetime Perfect Shifts: ${L.perfects}</div>
      <button class="back" data-act="back" data-focus>← Back</button>`;
  },

  screen_coop() {
    const N = PS.Net, C = PS.CONFIG, esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const intro = '<h2>Co-op · Deathlink</h2><p class="modedesc">Two players, one boss. You see each other live, damage to the boss is shared, and if one of you goes down, you <b>both</b> do.</p>';
    if (!N.available()) return intro + '<p class="smallnote">Online play is not set up on this version of the game.</p><button class="back" data-act="back">← Back</button>';
    if (N.status === 'idle' || N.status === 'error') {
      return intro + `
        ${N.status === 'error' ? '<p class="err">' + esc(N.error) + '</p>' : ''}
        <div class="coopform">
          <label for="coop-name">Your name</label>
          <input id="coop-name" maxlength="16" autocomplete="off" value="${esc(N.me().name)}" placeholder="Name">
          <button class="big" data-act="coop-host" data-focus>Create a room</button>
          <div class="or">or join a friend</div>
          <label for="coop-code">Room code</label>
          <div class="row"><input id="coop-code" maxlength="4" autocomplete="off" placeholder="ABCD" data-enter="coop-join" class="code"><button class="pill" data-act="coop-join">Join</button></div>
        </div>
        <button class="back" data-act="back">← Back</button>`;
    }
    const host = N.role === 'host', L = N.lobby;
    const who = N.status === 'connecting' ? 'Connecting…' : N.partner ? '✓ ' + esc(N.partner.name) + ' is in the room' : host ? 'Waiting for your friend… share the code' : 'Waiting for the host…';
    let body;
    if (host) {
      const bosses = C.bossOrder.map((id) => `<button class="pill ${L.boss === id ? 'on' : ''}" data-act="coop-boss" data-id="${id}">${this.BOSS_INFO[id].name}</button>`).join('');
      const diffs = Object.keys(C.difficulty).map((id) => `<button class="pill ${L.difficulty === id ? 'on' : ''}" data-act="coop-diff" data-id="${id}">${C.difficulty[id].label}</button>`).join('');
      body = `<h4>Boss</h4><div class="row">${bosses}</div><h4>Difficulty</h4><div class="row">${diffs}</div>
        <div class="row"><button class="big" data-act="coop-start" ${N.partner ? 'data-focus' : 'disabled'}>Start ▶</button></div>`;
    } else {
      body = `<p class="modedesc">${N.partner ? esc(N.partner.name) + ' picks the boss: <b>' + (this.BOSS_INFO[L.boss] || {}).name + '</b> · ' + (C.difficulty[L.difficulty] || {}).label + '. The fight starts when they press Start.' : ''}</p>`;
    }
    return intro + `
      <div class="roomcode">${esc(N.code || '')}</div>
      <div class="sub">${who}</div>
      ${body}
      <button class="back" data-act="coop-leave" ${host ? '' : 'data-focus'}>Leave the room</button>`;
  },

  screen_pause() {
    const g = PS.game;
    if (g.coop) return `<h2>Menu</h2>
      <div class="sub">Co-op with ${PS.Net.partnerName()} — the fight keeps running!</div>
      <div class="menu-col">
        <button data-act="resume" data-focus>Back to the fight</button>
        <button data-act="quit">Leave the match</button>
      </div>`;
    return `<h2>Paused</h2>
      <div class="sub">${g.boss ? g.boss.name : ''} · ${g.diff.label}</div>
      <div class="menu-col">
        <button data-act="resume" data-focus>Resume</button>
        <button data-act="restart">Restart</button>
        <button data-act="settings" data-back="pause">Settings</button>
        <button data-act="quit">Quit to menu</button>
      </div>
      ${this.controlsHtml()}`;
  },

  showResults(r) {
    this.lastResults = r;
    this.show('results');
    if (r.unlocks.length) PS.Audio.sfx('unlock');
  },

  screen_results() {
    const r = this.lastResults, U = PS.U;
    const status = r.mode === 'survival' ? 'SURVIVED ' + U.formatTime(r.time) : r.cleared ? 'CLEARED' : 'FAILED';
    const rank = r.rank || '—';
    const stat = (label, val) => `<div class="stat"><span>${label}</span><b>${val}</b></div>`;
    const acc = r.dashes ? Math.round(r.accuracy * 100) + '%' : '—';
    const best = r.newBest ? '<div class="newbest">NEW PERSONAL BEST</div>' : r.prevBest !== null ? '<div class="prev">Best: ' + r.prevBest.toLocaleString() + '</div>' : '';
    const pctLine = r.mode === 'survival'
      ? (r.newBestTime ? '<div class="pct new">NEW BEST TIME · ' + U.formatTime(r.time) + '</div>' : r.bestTime ? '<div class="pct">' + Math.floor((r.time / r.bestTime) * 100) + '% of your best time (' + U.formatTime(r.bestTime) + ')</div>' : '')
      : '<div class="pct' + (r.newBestPct ? ' new' : '') + '"><b>' + r.pct + '%</b>' + (r.newBestPct ? ' · NEW BEST %' : r.bestPct ? ' · best ' + r.bestPct + '%' : '') + '</div>';
    const coopLine = r.partner ? '<div class="prev">Co-op with ' + r.partner + (r.deathlinked ? ' · taken down by DEATHLINK' : '') + '</div>' : '';
    const unl = r.unlocks.length ? '<div class="unlocks">Unlocked: ' + r.unlocks.join(' · ') + '</div>' : '';
    const extra = r.mode === 'survival' ? stat('Level reached', r.level)
      : !r.cleared ? stat(r.mode === 'rush' ? 'Bosses cleared' : 'Boss damage', r.mode === 'rush' ? r.bossesCleared + '/3' : r.progress + '%') : stat('Rank points', r.points + '/110');
    return `
      <div class="restitle">${r.title}</div>
      <div class="status ${r.cleared || r.mode === 'survival' ? 'ok' : 'bad'}">${status}</div>
      <div class="rank rank-${rank.replace('+', 'p')}">${rank}</div>
      <div class="score">${r.score.toLocaleString()}</div>
      ${pctLine}${best}${coopLine}${unl}
      <div class="stats">
        ${stat('Perfect Shift accuracy', acc + ' <small>(' + r.perfects + '/' + r.dashes + ' dashes)</small>')}
        ${stat('Perfect Hops', r.perfectHops)}
        ${stat('Damage received', r.hits)}
        ${stat('Breaks / shards returned', r.breaks + ' / ' + r.breakHits)}
        ${stat('Max combo', r.maxCombo)}
        ${stat('Time', U.formatTime(r.time))}
        ${extra}
        ${stat('Difficulty', r.difficulty + (r.mods.length ? ' + ' + r.mods.join(', ') : ''))}
      </div>
      <div class="row">
        <button class="big" data-act="retry" data-focus>${r.mode === 'coop' ? 'Back to the room' : 'Retry (R)'}</button>
        <button class="big alt" data-act="menu">Menu</button>
      </div>`;
  }
};
