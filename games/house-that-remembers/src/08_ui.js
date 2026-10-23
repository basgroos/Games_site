// =====================================================================
//  UI — HUD, subtitles, readers, inventory, journal, puzzles, dialogue
// =====================================================================
const UI = {
  stack: [], subQ: [], subT: 0, lastPrompt: undefined,
  init() {
    $('readerPrev').onclick = () => this.page(-1);
    $('readerNext').onclick = () => this.page(1);
    $('readerClose').onclick = () => this.closeTop();
    $('inspectClose').onclick = () => this.closeTop();
    $('pzClose').onclick = () => this.closeTop();
    $('btnResume').onclick = () => Game.resume();
    $('btnSettings').onclick = () => this.openSettings();
    $('btnRestartCh').onclick = () => Game.restartChapter();
    $('btnQuit').onclick = () => Game.quitToTitle();
    $('setBack').onclick = () => this.closeTop();
    $('endTitleBtn').onclick = () => Game.quitToTitle();
    $('btnTitleSettings').onclick = () => this.openSettings();
    const bind = (id, key, fn, isCheck) => { const el = $(id); if (isCheck) el.checked = !!Settings[key]; else el.value = Settings[key]; el.oninput = el.onchange = () => { Settings[key] = isCheck ? el.checked : parseFloat(el.value); saveSettings(); if (fn) fn(); }; };
    bind('setSens', 'sens'); bind('setVol', 'vol', () => SFX.setVolume(Settings.vol)); bind('setBright', 'bright');
    bind('setSubs', 'subs', null, true); bind('setVoice', 'voice', () => { if (!Settings.voice && 'speechSynthesis' in window) speechSynthesis.cancel(); }, true); bind('setGrain', 'grain', null, true); bind('setInvert', 'invert', null, true); bind('setShadows', 'shadows', null, true);
    if (!('speechSynthesis' in window)) $('setVoice').disabled = true;
  },
  modalOpen() { return this.stack.length > 0; },
  open(id) {
    if (this.stack.includes(id)) return;
    $(id).classList.add('show'); this.stack.push(id); unlockPointer(); this.prompt(null);
  },
  close(id) {
    const i = this.stack.indexOf(id); if (i < 0) return;
    this.stack.splice(i, 1); $(id).classList.remove('show');
    const cb = this['onClose_' + id]; this['onClose_' + id] = null;
    if (!this.stack.length && G.state === 'play') lockPointer();
    if (cb) cb();
  },
  closeTop() { const id = this.stack[this.stack.length - 1]; if (!id) return; if (id === 'dialogue') return; this.close(id); },
  closeAll() { this.stack.slice().forEach(id => { this['onClose_' + id] = null; $(id).classList.remove('show'); }); this.stack = []; },
  // ---- HUD ----
  prompt(p) {
    if (p === this.lastPrompt) return; this.lastPrompt = p;
    const el = $('prompt'); el.style.opacity = p ? 1 : 0; if (p) el.innerHTML = '<b>E</b>' + esc(p);
    $('crosshair').classList.toggle('on', !!p);
  },
  objective(t) {
    if (!t || (Story.S && Story.S.objective === t)) return;
    if (Story.S) Story.S.objective = t;
    const el = $('objective'); el.innerHTML = '<small>Objective</small>' + esc(t); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  },
  notify(t) { const d = document.createElement('div'); d.textContent = t; $('notify').appendChild(d); setTimeout(() => d.remove(), 4600); },
  sub(who, text, dur = 3.5) { this.subQ.push({ who, text, dur }); if (this.subQ.length === 1 && this.subT <= 0) this.nextSub(); },
  say(text, dur = 3.5) { this.sub(null, text, dur); },
  nextSub() {
    const s = this.subQ[0]; const el = $('subs');
    if (!s) { el.style.opacity = 0; return; }
    if (this.subQ.length > 2) s.dur = Math.min(s.dur, 2.4);
    const isSound = /^\[/.test(s.text) && !s.who;
    if (!Settings.subs && (isSound || (s.who && s.who !== NM()))) { this.subQ.shift(); this.subT = 0; this.nextSub(); return; }
    el.innerHTML = (s.who ? `<span class="who">${esc(s.who)}:</span>` : '') + (isSound ? `<span class="snd">${esc(s.text)}</span>` : esc(s.text).replace(/\n/g, '<br>'));
    el.style.opacity = 1; this.subT = s.dur;
  },
  update(dt) {
    if (this.subT > 0) { this.subT -= dt; if (this.subT <= 0) { this.subQ.shift(); $('subs').style.opacity = 0; setTimeout(() => { if (this.subT <= 0) this.nextSub(); }, 350); } }
    const showHint = G.state === 'play' && !Input.locked && !this.modalOpen() && !Input.fallback;
    $('lockHint').style.display = showHint ? 'block' : 'none';
  },
  chapter(n) {
    const el = $('chapter'); el.querySelector('.n').textContent = 'Chapter ' + ROMAN[n]; el.querySelector('.t').textContent = CHAPTERS[n];
    el.style.transition = 'opacity 2.2s'; el.style.opacity = 1; clearTimeout(this.chT); this.chT = setTimeout(() => el.style.opacity = 0, 4200);
  },
  fade(v, s = 1.5) { const f = $('fade'); f.style.transition = `opacity ${s}s`; f.style.opacity = v; },
  // ---- reader ----
  read(title, pages, opt = {}) {
    this.rd = { pages, i: 0 }; $('readerTitle').textContent = title; $('readerPaper').classList.toggle('hand', !!opt.hand);
    this.onClose_reader = opt.onClose || null; this.page(0); this.open('reader'); SFX.click(null, .2, 2000);
  },
  page(d) {
    const r = this.rd; if (!r) return; r.i = clamp(r.i + d, 0, r.pages.length - 1);
    $('readerText').textContent = r.pages[r.i]; $('readerPage').textContent = r.pages.length > 1 ? `${r.i + 1} / ${r.pages.length}` : '';
    $('readerPrev').style.visibility = r.i > 0 ? 'visible' : 'hidden'; $('readerNext').style.visibility = r.i < r.pages.length - 1 ? 'visible' : 'hidden';
    $('readerPaper').scrollTop = 0; if (d) SFX.click(null, .15, 2600);
  },
  // ---- inspect / gallery ----
  inspect(title, text, canvas, onClose) { this.gallery(title, [{ canvas, text }], onClose); },
  gallery(title, pages, onClose) {
    this.gl = { pages, i: 0 }; $('inspectTitle').textContent = title; this.onClose_inspect = onClose || null;
    let nav = $('inspectNav');
    if (!nav) { nav = document.createElement('div'); nav.id = 'inspectNav'; nav.style.cssText = 'display:flex;justify-content:center;gap:10px;margin-bottom:12px'; nav.innerHTML = '<button id="inPrev">&larr;</button><span id="inPage" style="align-self:center;color:var(--dim);font-size:14px"></span><button id="inNext">&rarr;</button>'; $('inspectClose').before(nav); $('inPrev').onclick = () => this.gpage(-1); $('inNext').onclick = () => this.gpage(1); }
    this.gpage(0); this.open('inspect');
  },
  gpage(d) {
    const g = this.gl; g.i = clamp(g.i + d, 0, g.pages.length - 1); const p = g.pages[g.i];
    const img = $('inspectImg'); if (p.canvas) { img.src = p.canvas.toDataURL(); img.style.display = 'block'; } else img.style.display = 'none';
    $('inspectText').innerHTML = esc(p.text || '').replace(/\n/g, '<br>');
    const multi = g.pages.length > 1; $('inspectNav').style.display = multi ? 'flex' : 'none';
    if (multi) { $('inPage').textContent = `${g.i + 1} / ${g.pages.length}`; $('inPrev').disabled = g.i === 0; $('inNext').disabled = g.i === g.pages.length - 1; }
  },
  // ---- inventory & journal ----
  openInventory() {
    const grid = $('invGrid'); grid.innerHTML = ''; $('invDesc').textContent = Story.S.inv.length ? 'Select something to look at it.' : 'Your pockets are empty, apart from the torch.';
    Story.S.inv.forEach(id => {
      const it = ITEMS[id]; const d = document.createElement('div'); d.className = 'item'; d.innerHTML = esc(it.name);
      d.onclick = () => {
        grid.querySelectorAll('.item').forEach(e => e.classList.remove('sel')); d.classList.add('sel');
        const desc = $('invDesc'); desc.innerHTML = esc(it.desc);
        if (it.img) { const im = new Image(); im.src = it.img().toDataURL(); im.style.cssText = 'display:block;max-width:240px;margin-top:10px;box-shadow:0 6px 20px #000'; desc.appendChild(im); }
        if (it.read) { const b = document.createElement('button'); b.textContent = 'Read'; b.style.marginTop = '10px'; b.style.display = 'block'; b.onclick = () => { this.close('inventory'); it.read(); }; desc.appendChild(b); }
      };
      grid.appendChild(d);
    });
    this.open('inventory');
  },
  openJournal() {
    const S = Story.S; $('jObjective').textContent = S.objective ? 'Now: ' + S.objective : '';
    const ul = $('jList'); ul.innerHTML = '';
    if (!S.journal.length) ul.innerHTML = '<li style="color:var(--dim)">Nothing yet.</li>';
    S.journal.forEach(j => { const li = document.createElement('li'); li.style.cursor = 'pointer'; li.innerHTML = esc(j.title) + `<em>${esc(j.pages[0].slice(0, 90).replace(/\n+/g, ' '))}…</em>`; li.onclick = () => { this.close('journal'); this.read(j.title, j.pages, { hand: j.hand }); }; ul.appendChild(li); });
    const ms = Object.keys(S.mem);
    $('jMem').innerHTML = ms.length ? ms.map(id => `<div style="margin:6px 0"><b style="font-weight:normal;color:#e6dcc4">${esc(MEMS[id].title)}</b> — <span style="color:var(--dim)">${esc(MEMS[id].text)}</span></div>`).join('') + (ms.length < 6 ? `<div style="color:var(--faint);margin-top:8px;font-size:14px">The house is holding on to more of her.</div>` : '<div style="color:#c9b27f;margin-top:8px;font-size:14px">You have found all of her.</div>') : '<span style="color:var(--dim)">The house is holding on to things. You have not found any of them yet.</span>';
    this.open('journal');
  },
  // ---- puzzles & choices ----
  puzzle(title, text, build, onClose) {
    $('pzTitle').textContent = title; $('pzText').textContent = text; const body = $('pzBody'); body.innerHTML = '';
    this.onClose_puzzle = onClose || null; this.open('puzzle');
    build(body, () => this.close('puzzle'));
  },
  choose(title, text, opts) {
    this.puzzle(title, text, (body, close) => {
      const st = document.createElement('div'); st.className = 'stack';
      opts.forEach(o => { const b = document.createElement('button'); b.textContent = o.label; b.onclick = () => { close(); o.fn(); }; st.appendChild(b); });
      body.appendChild(st);
    });
  },
  // ---- dialogue ----
  dialogue(nodes, start, onNode) {
    this.dl = { nodes, onNode }; this.open('dialogue'); this.dnode(start);
  },
  dnode(id) {
    const d = this.dl; if (id == null) { this.close('dialogue'); return; }
    const n = d.nodes[id]; d.cur = n;
    $('dlgLine').innerHTML = (n.who ? `<span class="who">${esc(n.who)}:</span> ` : '') + esc(n.text);
    const o = $('dlgOpts'); o.innerHTML = '';
    if (d.onNode) d.onNode(n);
    if (n.who === 'Grandad') SFX.murmur(W.obj.arthur ? W.obj.arthur.getWorldPosition(new THREE.Vector3()).setY(BY + 1.3) : null, Math.min(4, n.text.length * .045), { pitch: 105, vol: .22 });
    if (n.opts) n.opts.forEach(op => { const b = document.createElement('button'); b.textContent = op.t; if (op.special) b.className = 'special'; b.onclick = () => this.dnode(op.to); o.appendChild(b); });
    else { const b = document.createElement('button'); b.textContent = 'Continue'; b.onclick = () => this.dadvance(); o.appendChild(b); }
  },
  dadvance() {
    const n = this.dl && this.dl.cur; if (!n || n.opts) return;
    if (n.next) this.dnode(n.next); else { this.close('dialogue'); if (n.act) n.act(); }
  },
  // ---- menus ----
  openSettings() { this.open('settings'); },
  endScreen(kicker, title, canvas, text, stats) {
    G.state = 'ending'; this.closeAll(); unlockPointer();
    $('endKicker').textContent = kicker; $('endTitle').textContent = title; $('endPhoto').src = canvas.toDataURL();
    $('endText').innerHTML = esc(text).replace(/\n/g, '<br>'); $('endStats').textContent = stats;
    $('endScreen').classList.add('show'); this.fade(0, 1);
  },
};
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
