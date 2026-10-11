// =============================================================
//  CO-OP (DEATHLINK) — two players, one boss, via Supabase Realtime.
//
//  How it works:
//   - The host makes a room with a 4-letter code; the friend joins with it.
//   - Room = Supabase Realtime channel "bg-room-ps-<env>-<CODE>" (broadcast + presence).
//     No database tables are needed.
//   - Both computers run the same fight from the same random seed, so the
//     attacks match. Aimed attacks alternate between the two players.
//   - Damage to the boss is shared. The host's boss HP is the truth and is
//     sent twice a second; the guest corrects small differences.
//   - DEATHLINK: when one player dies, the other dies too.
//
//  Messages: lobby, start, pos, dmg, hp, dead, win, bye
// =============================================================
PS.Net = {
  role: null,       // 'host' | 'guest'
  code: null,
  status: 'idle',   // idle | connecting | connected | error
  error: '',
  ch: null,
  rt: null,
  partner: null,    // { id, name } of the other player in the room
  remote: null,     // partner's live state in a match: { x, y, hp, maxHp, alive, dash, hop }
  lobby: { boss: 'metronome', difficulty: 'normal' }, // what the host picked
  sendT: 0,
  hpT: 0,
  fake: null,       // used by the tests to connect two games without the internet

  available() { return !!this.fake || !!(PS.BUILD.online && PS.BUILD.online.url && PS.BUILD.online.key); },

  // shared Bas Games player profile (same name as in the other games)
  me() {
    let P = {};
    try { P = JSON.parse(localStorage.getItem('basgames-player') || '{}') || {}; } catch (e) { P = {}; }
    if (!P.id) {
      P.id = 'ps-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      try { localStorage.setItem('basgames-player', JSON.stringify(P)); } catch (e) { /* ignore */ }
    }
    return { id: P.id, name: (P.name || '').trim() };
  },
  setName(name) {
    let P = {};
    try { P = JSON.parse(localStorage.getItem('basgames-player') || '{}') || {}; } catch (e) { P = {}; }
    P.name = String(name || '').trim().slice(0, 16);
    try { localStorage.setItem('basgames-player', JSON.stringify(P)); } catch (e) { /* ignore */ }
  },
  partnerName() { return this.partner ? this.partner.name : 'Partner'; },

  newCode() {
    const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I or O (they look like 1 and 0)
    let c = '';
    for (let i = 0; i < 4; i++) c += L[Math.floor(Math.random() * L.length)];
    return c;
  },

  async rtClient() {
    if (this.rt) return this.rt;
    if (!window.supabase) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
        s.onload = res; s.onerror = () => rej(new Error('Could not load the online library'));
        document.head.appendChild(s);
      });
    }
    const cfg = PS.BUILD.online;
    this.rt = window.supabase.createClient(cfg.url, cfg.key, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { params: { eventsPerSecond: 40 } } });
    return this.rt;
  },

  // join (or create) a room
  async open(code, role) {
    await this.leave();
    this.code = String(code || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
    this.role = role;
    this.status = 'connecting';
    this.error = '';
    this.partner = null;
    this.remote = null;
    this.changed();
    if (this.fake) { this.fake.connect(this); this.status = 'connected'; this.changed(); return; }
    try {
      const rt = await this.rtClient(), me = this.me();
      const ch = rt.channel('bg-room-ps-' + PS.BUILD.env + '-' + this.code, { config: { presence: { key: me.id }, broadcast: { self: false, ack: false } } });
      ch.on('presence', { event: 'sync' }, () => {
        const st = ch.presenceState();
        const others = Object.keys(st).filter((k) => k !== me.id);
        const had = !!this.partner;
        this.partner = others.length ? { id: others[0], name: ((st[others[0]] || [])[0] || {}).name || 'Player' } : null;
        if (had && !this.partner) this.partnerGone();
        if (!had && this.partner && this.role === 'host') this.sendLobby();
        this.changed();
      });
      for (const ev of ['lobby', 'start', 'pos', 'dmg', 'hp', 'dead', 'win', 'bye']) {
        ch.on('broadcast', { event: ev }, ({ payload }) => this.onMsg(ev, payload || {}));
      }
      ch.subscribe((st) => {
        if (st === 'SUBSCRIBED') { this.status = 'connected'; ch.track({ name: me.name || 'Player', role }); this.changed(); }
        else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') { this.status = 'error'; this.error = 'Connection failed. Try again.'; this.changed(); }
      });
      this.ch = ch;
    } catch (e) {
      this.status = 'error';
      this.error = e.message || 'Connection failed';
      this.changed();
    }
  },

  async leave() {
    if (this.status !== 'idle') this.send('bye', {});
    const ch = this.ch;
    this.ch = null;
    if (ch) { try { await ch.unsubscribe(); if (this.rt) this.rt.removeChannel(ch); } catch (e) { /* ignore */ } }
    if (this.fake && this.status !== 'idle') this.fake.disconnect(this);
    this.status = 'idle'; this.role = null; this.code = null; this.partner = null; this.remote = null;
  },

  send(event, payload) {
    if (this.fake) { if (this.status === 'connected') this.fake.send(this, event, payload); return; }
    if (this.ch) this.ch.send({ type: 'broadcast', event, payload });
  },

  // refresh the lobby screen when something changes
  changed() { if (PS.Menus.current === 'coop') PS.Menus.refresh(); },

  sendLobby() { if (this.role === 'host') this.send('lobby', this.lobby); },

  partnerGone() {
    const name = this.partnerName();
    this.remote = null;
    if (PS.game) PS.game.onPartnerLeft(name);
  },

  onMsg(ev, p) {
    const g = PS.game;
    switch (ev) {
      case 'lobby':
        if (this.role === 'guest') { this.lobby = { boss: p.boss, difficulty: p.difficulty }; this.changed(); }
        break;
      case 'start':
        if (this.role === 'guest') this.startGame(p);
        break;
      case 'pos': {
        const R = this.remote || (this.remote = { x: p.x, y: p.y });
        R.tx = p.x; R.ty = p.y; R.hp = p.hp; R.maxHp = p.mh; R.dash = p.d; R.hop = p.h;
        if (p.al === 0) R.alive = false;
        break;
      }
      case 'dmg': if (g.coop) g.onRemoteDmg(p.a); break;
      case 'hp': if (g.coop && this.role === 'guest') g.onRemoteHp(p.hp, p.ph); break;
      case 'dead':
        if (this.remote) this.remote.alive = false;
        if (g.coop) g.onRemoteDead(this.partnerName());
        break;
      case 'win': if (g.coop) g.onRemoteWin(); break;
      case 'bye': {
        const had = !!this.partner;
        this.partner = null;
        if (had) this.partnerGone();
        this.changed();
        break;
      }
    }
  },

  // host presses Start: both players start the same fight with the same seed
  hostStart() {
    if (this.role !== 'host' || !this.partner) return;
    const p = { boss: this.lobby.boss, difficulty: this.lobby.difficulty, seed: (Math.random() * 2147483647) | 0 };
    this.send('start', p);
    this.startGame(p);
  },

  startGame(p) {
    this.lobby = { boss: p.boss, difficulty: p.difficulty };
    const g = PS.game;
    this.remote = { x: g.W / 2 + (this.role === 'host' ? 90 : -90), y: g.H * 0.8, tx: null, ty: null, alive: true, hp: 1, maxHp: 1 };
    PS.Menus.hide();
    g.start({ mode: 'coop', boss: p.boss, difficulty: p.difficulty, modifiers: {}, seed: p.seed });
  },

  // called every frame during a co-op match
  update(dt) {
    const g = PS.game, p = g.player;
    this.sendT -= dt;
    if (this.sendT <= 0 && p) {
      this.sendT = 1 / 15; // 15 position updates per second
      this.send('pos', { x: Math.round(p.x), y: Math.round(p.y), hp: p.hp, mh: p.maxHp, d: p.dashing ? 1 : 0, h: p.hopping ? 1 : 0, al: p.alive ? 1 : 0 });
    }
    this.hpT -= dt;
    if (this.role === 'host' && this.hpT <= 0 && g.boss) {
      this.hpT = 0.5;
      this.send('hp', { hp: Math.round(g.boss.hp * 100) / 100, ph: g.boss.pendingPhase >= 0 ? g.boss.pendingPhase : g.boss.phase });
    }
    const R = this.remote;
    if (R && R.tx !== null && R.tx !== undefined) { // smooth movement between updates
      const k = Math.min(1, dt * 14);
      R.x += (R.tx - R.x) * k; R.y += (R.ty - R.y) * k;
    }
  },

  drawRemote(ctx, g) {
    const R = this.remote;
    if (!R || R.tx === null || R.tx === undefined) return;
    const pal = PS.Profile.palette(), U = PS.U, s = PS.CONFIG.player.size * (R.hop ? 1.35 : 1);
    ctx.save();
    ctx.translate(R.x, R.y - (R.hop ? 12 : 0));
    ctx.globalAlpha = R.alive === false ? 0.35 : 0.85;
    const G = Math.round(s * 3);
    ctx.drawImage(PS.glow(pal.accent, G), -G, -G);
    ctx.rotate(g.realTime * 1.5 + Math.PI / 4);
    ctx.strokeStyle = pal.accent; ctx.lineWidth = 3;
    ctx.fillStyle = U.rgba(pal.accent, 0.25);
    ctx.fillRect(-s * 0.75, -s * 0.75, s * 1.5, s * 1.5);
    ctx.strokeRect(-s * 0.75, -s * 0.75, s * 1.5, s * 1.5);
    ctx.restore();
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '700 12px ' + PS.FONT;
    ctx.fillStyle = U.rgba(pal.accent, R.alive === false ? 0.5 : 0.95);
    ctx.fillText((R.alive === false ? '✕ ' : '') + this.partnerName(), R.x, R.y - 26);
    ctx.restore();
  }
};
