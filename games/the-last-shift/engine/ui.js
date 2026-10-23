// Minimalistische HUD en menu's (DOM-overlay)
import { faceCanvas } from './textures.js';

const $ = (id) => document.getElementById(id);

export class UI {
  constructor(game) {
    this.game = game;
    this.el = {
      prompt: $('prompt'), toast: $('toast'), objective: $('objective'), pager: $('pager'), pagerText: $('pagerText'), pagerTime: $('pagerTime'),
      subtitle: $('subtitle'), note: $('note'), noteTitle: $('noteTitle'), noteBody: $('noteBody'), journal: $('journal'),
      keypad: $('keypad'), kpDisplay: $('kpDisplay'), hide: $('hideOverlay'), vignette: $('vignette'), fade: $('fade'),
      face: $('faceFlash'), chapter: $('chapter'), stamina: $('stamina'), crosshair: $('crosshair'), inspect: $('inspect'),
      inspectName: $('inspectName'), inspectDesc: $('inspectDesc'), choice: $('choice'),
    };
    this.pagerLog = []; this.noteLog = [];
    this.toastT = 0; this.objT = 0; this.pagerT = 0; this.subT = 0;
    this.modal = null;
    // gezicht voor schrikflitsen
    const fc = faceCanvas(1024, 512, true);
    const crop = document.createElement('canvas'); crop.width = 512; crop.height = 512;
    crop.getContext('2d').drawImage(fc, 0, 0, 512, 512, 0, 0, 512, 512);
    this.el.face.style.backgroundImage = `url(${crop.toDataURL()})`;
    this.buildKeypad();
  }
  update(dt) {
    if (this.toastT > 0) { this.toastT -= dt; if (this.toastT <= 0) this.el.toast.classList.remove('show'); }
    if (this.objT > 0) { this.objT -= dt; if (this.objT <= 0) this.el.objective.classList.remove('show'); }
    if (this.pagerT > 0) { this.pagerT -= dt; if (this.pagerT <= 0) this.el.pager.classList.remove('show'); }
    if (this.subT > 0) { this.subT -= dt; if (this.subT <= 0) this.el.subtitle.classList.remove('show'); }
    const inp = this.game.input;
    document.getElementById('clickHint').style.display = this.game.state === 'play' && !inp.locked && !inp.dragLook && !this.modal && !this.game.cinematic ? 'block' : 'none';
    const st = this.game.player.stamina;
    this.el.stamina.style.opacity = st < 0.98 ? 0.6 : 0;
    this.el.stamina.firstElementChild.style.width = (st * 100) + '%';
  }
  setPrompt(t) { if (this._p !== t) { this._p = t; this.el.prompt.innerHTML = t ? `<span class="key">E</span> ${t}` : ''; this.el.prompt.classList.toggle('show', !!t); this.el.crosshair.classList.toggle('active', !!t); } }
  toast(t, dur = 3.5) {
    const net = this.game.net;
    if (this.game.actor && net.active) { net.ui('toast', [t, dur], this.game.actor.peer); return; } // melding voor de co-op-gast die het deed
    this.el.toast.textContent = t; this.el.toast.classList.add('show'); this.toastT = dur; }
  objective(t, dur = 7) { this.game.net.ui('objective', [t, dur]); this.currentObjective = t; this.el.objective.innerHTML = `<small>DOEL</small>${t}`; this.el.objective.classList.add('show'); this.objT = dur; }
  showObjective() { if (this.currentObjective) this.objective(this.currentObjective, 4); }
  pager(text, from = 'RIA (PLOEGLEIDER)') {
    this.game.net.ui('pager', [text, from]);
    const time = this.game.clockString();
    this.pagerLog.push({ time, from, text });
    this.el.pagerTime.textContent = `${time} — ${from}`;
    this.el.pagerText.textContent = text;
    this.el.pager.classList.add('show');
    this.pagerT = Math.max(7, text.length / 14);
    this.game.audio.play('pager', { volume: 0.5 });
  }
  subtitle(t, dur = 3) { this.el.subtitle.innerHTML = t; this.el.subtitle.classList.add('show'); this.subT = dur; }
  chapter(num, title) {
    this.game.net.ui('chapter', [num, title]);
    this.el.chapter.innerHTML = `<small>HOOFDSTUK ${num}</small>${title}`;
    this.el.chapter.classList.remove('show'); void this.el.chapter.offsetWidth; this.el.chapter.classList.add('show');
  }
  // ---------- modale vensters ----------
  openNote(title, body, cls = '') {
    this.game.audio.play('paper', { volume: 0.7 });
    if (!this.noteLog.some((n) => n.title === title)) this.noteLog.push({ title, body, cls });
    this.el.noteTitle.textContent = title; this.el.noteBody.innerHTML = body;
    this.el.note.className = 'modal show ' + cls;
    this.modal = 'note';
    return new Promise((res) => { this._noteRes = res; });
  }
  closeModal() {
    if (this.modal === 'note') { this.el.note.classList.remove('show'); this._noteRes && this._noteRes(); this._noteRes = null; }
    if (this.modal === 'journal') this.el.journal.classList.remove('show');
    if (this.modal === 'keypad') { this.el.keypad.classList.remove('show'); this._kpRes && this._kpRes(null); }
    if (this.modal === 'inspect') { this.el.inspect.classList.remove('show'); this._inRes && this._inRes(); this._inRes = null; this.game.inspector.stop(); }
    this.modal = null;
    this.game.input.lock();
  }
  toggleJournal() {
    if (this.modal === 'journal') { this.closeModal(); return; }
    if (this.modal) return;
    const g = this.game;
    const inv = g.inv.items.map((i) => `<div class="slot"><b>${i.name}${i.count > 1 ? ' ×' + i.count : ''}</b><span>${i.desc}</span></div>`);
    while (inv.length < g.inv.max) inv.push('<div class="slot empty">— leeg —</div>');
    const code = g.story.codeDisplay();
    this.el.journal.innerHTML = `
      <div class="jcol"><h3>INVENTARIS <small>${g.inv.items.length}/${g.inv.max}</small></h3>${inv.join('')}
      <h3>DOEL</h3><p>${this.currentObjective || '—'}</p>
      ${code ? `<h3>GEKRASTE CIJFERS</h3><p class="code">${code}</p>` : ''}
      <p class="clock">${g.clockString()} — ${g.level.roomAt(g.player.pos.x, g.player.pos.z)?.name || ''}</p></div>
      <div class="jcol"><h3>PIEPER</h3>${this.pagerLog.slice().reverse().map((p) => `<div class="pmsg"><small>${p.time} — ${p.from}</small>${p.text}</div>`).join('') || '<p>—</p>'}</div>
      <div class="jcol"><h3>DOCUMENTEN</h3>${this.noteLog.map((n, i) => `<div class="doc" data-i="${i}">${n.title}</div>`).join('') || '<p>—</p>'}</div>
      <div class="jhint">TAB — sluiten</div>`;
    this.el.journal.querySelectorAll('.doc').forEach((d) => d.onclick = () => { const n = this.noteLog[+d.dataset.i]; this.el.journal.classList.remove('show'); this.modal = null; this.openNote(n.title, n.body, n.cls); });
    this.el.journal.classList.add('show'); this.modal = 'journal';
    g.input.unlock();
  }
  buildKeypad() {
    const grid = this.el.keypad.querySelector('.kpgrid');
    for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK']) {
      const b = document.createElement('button'); b.textContent = k; b.onclick = () => this.kpPress(k); grid.appendChild(b);
    }
  }
  openKeypad() {
    this.kpVal = ''; this.el.kpDisplay.textContent = '----'; this.el.keypad.classList.add('show'); this.modal = 'keypad';
    this.game.input.unlock();
    return new Promise((res) => { this._kpRes = res; });
  }
  kpPress(k) {
    const a = this.game.audio;
    if (k === 'C') { this.kpVal = ''; a.play('beep'); }
    else if (k === 'OK') { const v = this.kpVal; this._kpRes && this._kpRes(v); this._kpRes = null; return; }
    else if (this.kpVal.length < 4) { this.kpVal += k; a.play('beep'); }
    this.el.kpDisplay.textContent = (this.kpVal + '----').slice(0, 4);
  }
  keypadResult(ok) {
    this.el.kpDisplay.textContent = ok ? 'OPEN' : 'FOUT';
    this.el.kpDisplay.className = ok ? 'ok' : 'err';
    setTimeout(() => { this.el.kpDisplay.className = ''; if (ok) this.closeModal(); else { this.kpVal = ''; this.el.kpDisplay.textContent = '----'; } }, ok ? 700 : 900);
  }
  openInspect(name, desc) {
    this.el.inspectName.textContent = name; this.el.inspectDesc.textContent = desc;
    this.el.inspect.classList.add('show'); this.modal = 'inspect';
    return new Promise((res) => { this._inRes = res; });
  }
  choice(title, options) {
    this.el.choice.innerHTML = `<h2>${title}</h2>` + options.map((o, i) => `<button data-i="${i}">${o.label}<small>${o.sub || ''}</small></button>`).join('');
    this.el.choice.classList.add('show'); this.modal = 'choice'; this.game.input.unlock();
    return new Promise((res) => { this.el.choice.querySelectorAll('button').forEach((b) => b.onclick = () => { this.el.choice.classList.remove('show'); this.modal = null; this.game.input.lock(); res(+b.dataset.i); }); });
  }
  // ---------- effecten ----------
  setHidden(type) { this.el.hide.className = type ? 'show ' + type : ''; }
  flashVignette(a = 0.6) { const v = this.el.vignette; v.style.transition = 'none'; v.style.opacity = a; void v.offsetWidth; v.style.transition = 'opacity 1.6s'; v.style.opacity = 0; }
  faceFlash(ms = 90, big = false) {
    const f = this.el.face; f.className = big ? 'show big' : 'show';
    setTimeout(() => { f.className = ''; }, ms);
  }
  fadeTo(color, opacity, sec) {
    const f = this.el.fade; f.style.transition = `opacity ${sec}s`; f.style.background = color; f.style.opacity = opacity;
    return new Promise((r) => setTimeout(r, window.__fast ? 1 : sec * 1000));
  }
  screen(id, show) { $(id).classList.toggle('show', show); }
}
