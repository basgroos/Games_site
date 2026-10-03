/* =====================================================================
   Vrienden en uitnodigingen (Supabase).
   - Iedere speler krijgt bij het kiezen van een naam een vriendcode (bijv. K7Q-M2X).
   - Schrijfacties lopen via databasefuncties met een geheim spelers-token.
   - Online-status en meldingen via Supabase Realtime (lobby-kanaal).
   ===================================================================== */
const SOC = {
  data: null, online: new Set(), seenInv: new Set(), listeners: [], lobby: null, rt: null, busy: false, err: null,
  get on() { return NET.on; },
  env: (window.HW_BUILD && window.HW_BUILD.env) || 'live',
  emit() { for (const f of this.listeners) try { f(); } catch (e) { } },
  me() { return readPlayer(); },
  secret() {
    const P = readPlayer();
    if (!P.secret) { const b = new Uint8Array(24); (window.crypto && crypto.getRandomValues) ? crypto.getRandomValues(b) : b.forEach((_, i) => { b[i] = Math.random() * 256 | 0; }); P.secret = Array.from(b, x => x.toString(16).padStart(2, '0')).join(''); if (!P.id) P.id = playerId(); writePlayer(P); }
    return P.secret;
  },
  async rpc(fn, args) {
    const cfg = window.HW_BUILD.online, key = cfg.key;
    const r = await fetch(cfg.url.replace(/\/+$/, '') + '/rest/v1/rpc/' + fn, { method: 'POST', headers: Object.assign({ apikey: key, 'Content-Type': 'application/json' }, /^eyJ/.test(key) ? { Authorization: 'Bearer ' + key } : {}), body: JSON.stringify(args) });
    const txt = await r.text(); let j = null; try { j = txt ? JSON.parse(txt) : null; } catch (e) { j = txt; }
    if (!r.ok) { const m = (j && (j.message || j.hint)) || ('HTTP ' + r.status); const er = new Error(m); er.status = r.status; throw er; }
    return j;
  },
  auth() { return { p_id: playerId(), p_secret: this.secret() }; },
  // registreren of naam bijwerken; geeft de vriendcode terug
  async ensure() {
    if (!this.on || !playerName()) return null;
    const P = readPlayer();
    if (P.code && P.regName === playerName()) return P.code;
    try {
      const r = await this.rpc('register_player', Object.assign(this.auth(), { p_name: playerName() }));
      const Q = readPlayer(); Q.code = r.code; Q.regName = playerName(); writePlayer(Q); this.emit(); return r.code;
    } catch (e) {
      if (/auth/.test(e.message)) { const Q = readPlayer(); Q.id = newUuid(); delete Q.secret; delete Q.code; writePlayer(Q); Store.data.playerId = Q.id; Store.save(); return this.ensure(); }
      this.err = e.message; return null;
    }
  },
  async refresh() {
    if (!this.on || !playerName() || this.busy) return this.data;
    this.busy = true;
    try {
      await this.ensure();
      const d = await this.rpc('my_social', this.auth());
      this.data = d; this.err = null;
      for (const inv of d.invites || []) if (!this.seenInv.has(inv.id)) { this.seenInv.add(inv.id); if (inv.env === this.env && inv.game === 'heldenwacht') showInvitePopup(inv); }
      this.emit(); updateSocialDot();
    } catch (e) { this.err = /does not exist|not find|PGRST202/.test(e.message) ? 'setup' : e.message; this.emit(); }
    finally { this.busy = false; }
    return this.data;
  },
  async addFriend(code) { const r = await this.rpc('friend_request', Object.assign(this.auth(), { p_code: code })); await this.refresh(); if (r === 'sent' || r === 'accepted') { const f = (this.data.friends || []).concat(this.data.outgoing || []).find(x => x.code === normCode(code)); if (f) this.ping(f.id, 'friend'); } return r; },
  async respond(id, accept) { const r = await this.rpc('friend_respond', Object.assign(this.auth(), { p_other: id, p_accept: accept })); this.ping(id, 'friend'); await this.refresh(); return r; },
  async remove(id) { await this.rpc('friend_remove', Object.assign(this.auth(), { p_other: id })); this.ping(id, 'friend'); await this.refresh(); },
  async invite(to, kind, map, diff) { const r = await this.rpc('invite_send', Object.assign(this.auth(), { p_to: to, p_kind: kind, p_map: map, p_diff: diff, p_env: this.env })); this.ping(to, 'invite', { id: r.id }); return r; },
  async answer(inv, accept) { const r = await this.rpc('invite_respond', Object.assign(this.auth(), { p_invite: inv.id, p_accept: accept })); this.ping(inv.from_id, accept ? 'accept' : 'decline', { id: inv.id }); return r; },
  async cancel(invId, to) { try { await this.rpc('invite_cancel', Object.assign(this.auth(), { p_invite: invId })); } catch (e) { } if (to) this.ping(to, 'cancel', { id: invId }); },
  isOnline(f) { return this.online.has(f.id) || (f.last_seen && Date.now() - new Date(f.last_seen).getTime() < 90000); },

  /* ---------- realtime ---------- */
  async rtClient() {
    if (this.rt) return this.rt;
    if (!window.supabase) await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js'; s.onload = res; s.onerror = () => rej(new Error('Realtime-bibliotheek kon niet laden')); document.head.appendChild(s); });
    const cfg = window.HW_BUILD.online;
    this.rt = window.supabase.createClient(cfg.url, cfg.key, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { params: { eventsPerSecond: 40 } } });
    return this.rt;
  },
  async connectLobby() {
    if (!this.on || !playerName() || this.lobby) return;
    try {
      const rt = await this.rtClient(), me = playerId();
      const ch = rt.channel('bg-lobby-' + this.env, { config: { presence: { key: me }, broadcast: { self: false } } });
      ch.on('presence', { event: 'sync' }, () => { this.online = new Set(Object.keys(ch.presenceState())); this.emit(); });
      ch.on('broadcast', { event: 'ping' }, ({ payload }) => { if (payload && payload.to === me) this.onPing(payload); });
      ch.subscribe(st => { if (st === 'SUBSCRIBED') ch.track({ name: playerName(), game: 'heldenwacht', t: Date.now() }); });
      this.lobby = ch;
    } catch (e) { this.err = e.message; }
  },
  ping(to, kind, data) { if (this.lobby) this.lobby.send({ type: 'broadcast', event: 'ping', payload: { to, from: playerId(), name: playerName(), kind, data: data || null } }); },
  onPing(p) {
    if (p.kind === 'accept' || p.kind === 'decline' || p.kind === 'cancel') MP.onInviteAnswer && MP.onInviteAnswer(p);
    if (p.kind === 'cancel') { const el = document.querySelector(`.mp-invite[data-id="${p.data && p.data.id}"]`); if (el) el.remove(); }
    if (p.kind === 'friend') toast(`${p.name} heeft je vriendenlijst bijgewerkt.`, '');
    this.refresh();
  },
};
const normCode = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const fmtCode = c => (c ? c.slice(0, 3) + '-' + c.slice(3) : '…');
const MP = window.MP || (window.MP = {});

// registreren zodra iemand een naam kiest, en bij het opstarten
const _setPlayerName13 = setPlayerName;
setPlayerName = function (n) { const r = _setPlayerName13.apply(this, arguments); if (SOC.on) { const P = readPlayer(); delete P.regName; writePlayer(P); SOC.ensure().then(() => { SOC.connectLobby(); SOC.refresh(); }); } return r; };
setTimeout(() => { if (SOC.on && playerName()) { SOC.connectLobby(); SOC.refresh(); } }, 1500);
setInterval(() => { if (SOC.on && playerName() && !document.hidden) SOC.refresh(); }, 20000);

/* ---------- melding bij een uitnodiging (overal in het spel) ---------- */
const KIND_LABEL = { race: 'Race', coop: 'Co-op' };
function mapLabel(id) { const m = MAPS.concat(SPECIAL_MAPS).find(x => x.id === id); return m ? m.name : id; }
function showInvitePopup(inv) {
  if (document.querySelector(`.mp-invite[data-id="${inv.id}"]`)) return;
  let box = document.getElementById('mp-invites'); if (!box) { box = document.createElement('div'); box.id = 'mp-invites'; document.body.appendChild(box); }
  const el = document.createElement('div'); el.className = 'mp-invite'; el.dataset.id = inv.id;
  el.innerHTML = `<div class="mi-top"><span class="mi-kind k-${inv.kind}">${KIND_LABEL[inv.kind]}</span><b>${esc(inv.from_name)}</b> nodigt je uit</div>
    <div class="muted" style="font-size:13px">${inv.kind === 'race' ? 'Wie houdt het langst vol? Speel tegen elkaar' : 'Verdedig samen één basis'} · ${esc(mapLabel(inv.map))} · ${esc((DIFFS[inv.diff] || {}).name || '')}</div>
    <div class="btn-row" style="justify-content:flex-start;margin-top:6px"><button class="btn btn-sm btn-good" data-act="inv-accept" data-id="${inv.id}">Accepteren</button><button class="btn btn-sm" data-act="inv-decline" data-id="${inv.id}">Weigeren</button></div>`;
  box.appendChild(el); Sfx.play('ability');
  setTimeout(() => el.remove(), 5 * 60 * 1000);
}
function updateSocialDot() {
  const b = document.querySelector('[data-act="nav"][data-to="friends"]'); if (!b) return;
  const d = SOC.data, n = d ? (d.incoming || []).length + (d.invites || []).filter(i => i.env === SOC.env).length : 0;
  let dot = b.querySelector('.ndot'); if (n) { if (!dot) { dot = document.createElement('span'); dot.className = 'ndot'; b.appendChild(dot); } dot.textContent = n; } else if (dot) dot.remove();
}

/* ---------- Vrienden-scherm ---------- */
App.friendInv = null;
function renderFriends() {
  const scr = $('#scr-friends'); if (!scr) return;
  const P = readPlayer(), d = SOC.data;
  if (!SOC.on) { scr.innerHTML = `<div class="screen-head"><div><span class="kicker">Samen spelen</span><h2>Vrienden</h2></div></div><div class="panel card"><p class="muted" style="margin:0">Vrienden en samen spelen werken alleen op de Bas Games-website.</p></div>`; return; }
  if (!playerName()) { scr.innerHTML = `<div class="screen-head"><div><span class="kicker">Samen spelen</span><h2>Vrienden</h2></div></div><div class="panel card"><p style="margin:0 0 10px">Kies eerst een spelersnaam. Dan krijg je een vriendcode die je aan vrienden kunt geven.</p><button class="btn btn-pow" data-act="name-edit">Naam kiezen</button></div>`; return; }
  const setupErr = SOC.err === 'setup';
  const fr = d ? d.friends || [] : [], inc = d ? d.incoming || [] : [], out = d ? d.outgoing || [] : [], invs = d ? (d.invites || []).filter(i => i.env === SOC.env) : [];
  const onl = fr.filter(f => SOC.isOnline(f)).length;
  scr.innerHTML = `<div class="screen-head"><div><span class="kicker">Samen spelen</span><h2>Vrienden</h2></div>
      <div class="code-pill" title="Geef deze code aan je vrienden"><small>Jouw vriendcode</small><b class="num" id="my-code">${fmtCode(P.code)}</b><button class="btn btn-sm" data-act="copy-code" ${P.code ? '' : 'disabled'}>Kopieer</button></div></div>
    ${setupErr ? `<div class="panel card" style="border-color:var(--danger)"><b>De database is nog niet klaar.</b><p class="muted" style="margin:4px 0 0">Plak <code>supabase/schema_social.sql</code> in de SQL Editor van Supabase om vrienden te kunnen gebruiken.</p></div>` : ''}
    ${SOC.err && !setupErr ? `<p class="muted">Kan de vriendenlijst nu niet laden (${esc(SOC.err)}). Probeer het later opnieuw.</p>` : ''}
    <div class="two-col">
      <div class="panel card">
        <div class="section-title" style="margin-top:0">Vriend toevoegen</div>
        <form id="add-friend" class="add-friend" autocomplete="off"><input id="friend-code" class="name-in" maxlength="9" placeholder="Vriendcode, bijv. K7Q-M2X" aria-label="Vriendcode"><button class="btn btn-pow" type="submit">Toevoegen</button></form>
        <p class="code-err" id="friend-err" aria-live="polite"></p>
        ${invs.length ? `<div class="section-title">Uitnodigingen om te spelen</div>${invs.map(i => `<div class="fr-row"><span class="mi-kind k-${i.kind}">${KIND_LABEL[i.kind]}</span><div class="fr-main"><b>${esc(i.from_name)}</b><span class="muted">${esc(mapLabel(i.map))} · ${esc((DIFFS[i.diff] || {}).name || '')}</span></div><button class="btn btn-sm btn-good" data-act="inv-accept" data-id="${i.id}">Accepteren</button><button class="btn btn-sm" data-act="inv-decline" data-id="${i.id}">Weigeren</button></div>`).join('')}` : ''}
        ${inc.length ? `<div class="section-title">Vriendschapsverzoeken</div>${inc.map(f => `<div class="fr-row"><div class="fr-main"><b>${esc(f.name)}</b><span class="muted num">${fmtCode(f.code)}</span></div><button class="btn btn-sm btn-good" data-act="fr-accept" data-id="${f.id}">Accepteren</button><button class="btn btn-sm" data-act="fr-decline" data-id="${f.id}">Weigeren</button></div>`).join('')}` : ''}
        ${out.length ? `<div class="section-title">Verstuurd, wacht op antwoord</div>${out.map(f => `<div class="fr-row"><div class="fr-main"><b>${esc(f.name)}</b><span class="muted num">${fmtCode(f.code)}</span></div><button class="btn btn-sm" data-act="fr-remove" data-id="${f.id}">Intrekken</button></div>`).join('')}` : ''}
        <p class="muted" style="font-size:13px;margin:12px 0 0">Geef je vriendcode aan een vriend, of vul die van hem in. Als hij accepteert, kun je hem uitnodigen voor een <b>Race</b> (tegen elkaar, ieder op een eigen veld) of <b>Co-op</b> (samen één basis verdedigen).</p>
      </div>
      <div class="panel card">
        <div class="section-title" style="margin-top:0">Vrienden <span class="muted num">${fr.length}${fr.length ? ` · ${onl} online` : ''}</span></div>
        ${!d && !SOC.err ? '<p class="muted">Laden…</p>' : fr.length ? fr.slice().sort((a, b) => SOC.isOnline(b) - SOC.isOnline(a) || a.name.localeCompare(b.name)).map(f => { const on = SOC.isOnline(f); return `<div class="fr-row"><span class="dot ${on ? 'on' : ''}" title="${on ? 'Online' : 'Offline'}"></span><div class="fr-main"><b>${esc(f.name)}</b><span class="muted">${on ? 'Online' : f.last_seen ? 'Laatst gezien ' + agoText(f.last_seen) : 'Offline'} · <span class="num">${fmtCode(f.code)}</span></span></div>
          <button class="btn btn-sm btn-pow" data-act="fr-invite" data-id="${f.id}" data-k="race" ${on ? '' : 'title="Je vriend is offline; de uitnodiging blijft 15 minuten staan"'}>Race</button><button class="btn btn-sm btn-sky" data-act="fr-invite" data-id="${f.id}" data-k="coop">Co-op</button><button class="btn btn-sm btn-ghost" data-act="fr-remove" data-id="${f.id}" aria-label="Verwijderen" title="Vriend verwijderen">×</button></div>`; }).join('') : '<p class="muted">Nog geen vrienden. Voeg iemand toe met zijn vriendcode.</p>'}
      </div>
    </div>`;
  $('#add-friend').addEventListener('submit', async ev => {
    ev.preventDefault(); const inp = $('#friend-code'), err = $('#friend-err'), c = normCode(inp.value);
    if (c.length !== 6) { err.textContent = 'Een vriendcode heeft 6 tekens, bijvoorbeeld K7Q-M2X.'; Sfx.play('error'); return; }
    err.textContent = 'Bezig…';
    try {
      const r = await SOC.addFriend(c);
      const msg = { sent: 'Verzoek verstuurd! Zodra je vriend accepteert, staat hij in je lijst.', accepted: 'Jullie zijn nu vrienden!', already: 'Jullie zijn al vrienden.', self: 'Dat is je eigen code.', notfound: 'Geen speler gevonden met deze code.', limit: 'Je hebt te veel openstaande verzoeken.' }[r] || r;
      if (r === 'sent' || r === 'accepted') { Sfx.play('coin'); toast(msg, 'good'); renderFriends(); } else { const e2 = $('#friend-err'); if (e2) e2.textContent = msg; Sfx.play('error'); }
    } catch (e) { const e2 = $('#friend-err'); if (e2) e2.textContent = e.message === 'auth' ? 'Inloggen mislukt, probeer opnieuw.' : 'Er ging iets mis. Probeer het opnieuw.'; }
  });
}
function agoText(ts) { const s = (Date.now() - new Date(ts).getTime()) / 1000; if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min geleden`; if (s < 86400) return `${Math.round(s / 3600)} uur geleden`; return `${Math.round(s / 86400)} dagen geleden`; }
SOC.listeners.push(() => { if (App.screen === 'friends' && !App.game && !document.getElementById('friend-code')?.value && !document.querySelector('#overlay-root .mp-dialog')) renderFriends(); updateSocialDot(); });

/* ---------- uitnodiging versturen: map en moeilijkheid kiezen ---------- */
function openInviteDialog(friendId, kind) {
  const f = (SOC.data.friends || []).find(x => x.id === friendId); if (!f) return;
  const maps = MAPS.filter((m, i) => Progress.mapUnlocked(i));
  App.friendInv = { id: friendId, kind, map: (App.friendInv && maps.some(m => m.id === App.friendInv.map)) ? App.friendInv.map : maps[0].id, diff: App.friendInv ? App.friendInv.diff : 1 };
  const I = App.friendInv, mi = MAPS.findIndex(m => m.id === I.map);
  const diffs = DIFFS.map((dd, j) => ({ dd, j, ok: Progress.diffUnlocked(mi, j) })).filter(x => x.ok);
  if (!diffs.some(x => x.j === I.diff)) I.diff = diffs[0].j;
  $('#overlay-root').innerHTML = `<div class="overlay" data-act="modal-bg" role="dialog" aria-modal="true" aria-labelledby="inv-title"><div class="panel modal-card mp-dialog" style="width:min(640px,100%)">
    <button type="button" class="close-x" data-act="modal-close" aria-label="Sluiten">×</button>
    <span class="kicker">${kind === 'race' ? 'Tegen elkaar' : 'Samen'}</span><h2 id="inv-title" style="font-size:26px">${KIND_LABEL[kind]} met ${esc(f.name)}</h2>
    <p class="muted" style="margin:4px 0 12px">${kind === 'race' ? 'Jullie spelen tegelijk dezelfde map met precies dezelfde golven, ieder op een eigen veld. Je ziet live hoe je vriend ervoor staat en je kunt vijanden naar hem sturen. De golven gaan eindeloos door en worden steeds zwaarder: wie het langst overeind blijft, wint. Met genoeg geld stuur je zelfs een baas.' : 'Jullie verdedigen samen één basis. Ieder heeft zijn eigen geld en plaatst zijn eigen helden. Vijanden zijn sterker dan normaal.'}</p>
    <div class="section-title" style="margin-top:0">Map</div><div class="pick-row">${maps.map(m => `<button class="pick" data-act="inv-map" data-id="${m.id}" aria-pressed="${m.id === I.map}">${esc(m.name)}</button>`).join('')}</div>
    <div class="section-title">Moeilijkheid</div><div class="pick-row">${diffs.map(x => `<button class="pick" data-act="inv-diff" data-d="${x.j}" aria-pressed="${x.j === I.diff}">${esc(x.dd.name)}</button>`).join('')}</div>
    <div class="btn-row" style="margin-top:14px"><button class="btn" data-act="modal-close">Annuleren</button><button class="btn btn-pow" data-act="inv-send">Uitnodiging versturen</button></div>
  </div></div>`;
}
Object.assign(ACTIONS, {
  'copy-code': () => { const c = fmtCode(readPlayer().code); try { navigator.clipboard.writeText(c); toast(`Vriendcode ${c} gekopieerd.`, 'good'); } catch (e) { toast(`Je vriendcode is ${c}.`, 'good'); } Sfx.play('click'); },
  'fr-accept': async b => { try { await SOC.respond(b.dataset.id, true); toast('Jullie zijn nu vrienden!', 'good'); Sfx.play('coin'); } catch (e) { toast('Dat lukte niet. Probeer het opnieuw.', 'bad'); } renderFriends(); },
  'fr-decline': async b => { try { await SOC.respond(b.dataset.id, false); } catch (e) { } renderFriends(); },
  'fr-remove': async b => { if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Zeker?'; return; } try { await SOC.remove(b.dataset.id); } catch (e) { } renderFriends(); },
  'fr-invite': b => { openInviteDialog(b.dataset.id, b.dataset.k); Sfx.play('click'); },
  'inv-map': b => { App.friendInv.map = b.dataset.id; openInviteDialog(App.friendInv.id, App.friendInv.kind); },
  'inv-diff': b => { App.friendInv.diff = +b.dataset.d; openInviteDialog(App.friendInv.id, App.friendInv.kind); },
  'inv-send': async () => {
    const I = App.friendInv, f = (SOC.data.friends || []).find(x => x.id === I.id);
    try { const r = await SOC.invite(I.id, I.kind, I.map, I.diff); closeOverlay(); MP.waitForAnswer(Object.assign({}, r, { to: I.id, toName: f ? f.name : 'je vriend', kind: I.kind, map: I.map, diff: I.diff })); }
    catch (e) { toast(/notfriends/.test(e.message) ? 'Jullie zijn (nog) geen vrienden.' : 'Uitnodigen lukte niet. Probeer het opnieuw.', 'bad'); }
  },
  'inv-accept': async b => {
    const inv = ((SOC.data && SOC.data.invites) || []).find(i => i.id === b.dataset.id); const pop = document.querySelector(`.mp-invite[data-id="${b.dataset.id}"]`); if (pop) pop.remove();
    if (!inv) { toast('Deze uitnodiging is verlopen.', 'bad'); return; }
    try { const r = await SOC.answer(inv, true); if (!r || !r.ok) { toast('Deze uitnodiging is verlopen of ingetrokken.', 'bad'); SOC.refresh(); return; } MP.join(Object.assign({}, inv, r), 'guest', { id: inv.from_id, name: inv.from_name }); }
    catch (e) { toast('Accepteren lukte niet. Probeer het opnieuw.', 'bad'); }
  },
  'inv-decline': async b => { const inv = ((SOC.data && SOC.data.invites) || []).find(i => i.id === b.dataset.id); const pop = document.querySelector(`.mp-invite[data-id="${b.dataset.id}"]`); if (pop) pop.remove(); if (inv) { try { await SOC.answer(inv, false); } catch (e) { } } SOC.refresh(); },
});
