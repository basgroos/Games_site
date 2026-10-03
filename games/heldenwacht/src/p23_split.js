/* =====================================================================
   Race splitscreen: je ziet het veld van je tegenstander live naast het
   jouwe — zijn helden, zijn vijanden (ook de vijanden die jij stuurde)
   en zijn basis.
   - Elke speler stuurt ~5× per seconde een compact beeld ('vw'):
     vijanden [id, soort, x, y, hp%, vlag] en elke seconde zijn helden.
   - De ontvanger tekent dat met dezelfde tekenfuncties als het spel en
     schuift vijanden vloeiend tussen twee beelden in.
   ===================================================================== */
const VIEW_EVERY = 200, VIEW_HEROES_EVERY = 1000, VIEW_MAX_EN = 150;
const VIEW_TYPES = Object.keys(ENEMIES);
const viewTypeIdx = t => { let i = VIEW_TYPES.indexOf(t); if (i < 0) { VIEW_TYPES.push(t); i = VIEW_TYPES.length - 1; } return i; };
const splitOn = () => (Store.data.settings.splitView !== false);

/* ---------- versturen ---------- */
function viewPacket(g, withHeroes) {
  const E = [], list = g.enemies;
  for (let i = 0; i < list.length && E.length < VIEW_MAX_EN * 6; i++) {
    const e = list[i]; if (e.dead || e.d < -4) continue;
    const hp = e.maxHp > 0 ? Math.max(1, Math.round(e.hp / e.maxHp * 100)) : 100;
    E.push(e.id, viewTypeIdx(e.type), Math.round(e.x), Math.round(e.y), hp, (e.sentBy ? 2 : 0) | (e.boss ? 4 : 0) | (e.invis && !e.revealed ? 8 : 0));
  }
  const p = { e: E, n: VIEW_TYPES.length, hp: Math.max(0, Math.ceil(g.hp)), mhp: g.maxHp, w: g.wave, c: Math.round(g.cash) };
  if (withHeroes) p.h = g.heroes.filter(h => !h.temp).map(h => [h.id, h.tx, h.ty, h.tier, h.skin || (Store.data.heroes[h.id] || {}).skin || null, Math.round((h.ang || 0) * 10) / 10]);
  return p;
}
const _update23 = Game.prototype.update;
Game.prototype.update = function (dt) {
  const r = _update23.call(this, dt);
  if (this.mode === 'race' && this.mp && !this.over) {
    const now = Date.now();
    if (now - (this.vwLast || 0) >= VIEW_EVERY) {
      this.vwLast = now; const withH = now - (this.vwHeroLast || 0) >= VIEW_HEROES_EVERY;
      if (withH) this.vwHeroLast = now;
      MP.send('vw', viewPacket(this, withH));
    }
  }
  if (this.oppFx) for (const f of this.oppFx) f.life -= dt;
  if (this.oppFx && this.oppFx.length && this.oppFx[0].life <= 0) this.oppFx = this.oppFx.filter(f => f.life > 0);
  return r;
};

/* ---------- ontvangen ---------- */
const _onMsg23 = MP.onMsg;
MP.onMsg = function (ev, p) {
  if (ev === 'vw') { const g = App.game; if (g && g.mode === 'race' && g.mp) viewReceive(g, p); return; }
  return _onMsg23.call(this, ev, p);
};
function viewReceive(g, p) {
  const V = g.oview || (g.oview = { cur: null, prev: null, heroes: [], look: {} });
  const now = performance.now(), m = new Map(), E = p.e || [];
  for (let i = 0; i + 5 < E.length; i += 6) m.set(E[i], { id: E[i], type: VIEW_TYPES[E[i + 1]] || 'grunt', x: E[i + 2], y: E[i + 3], hp: E[i + 4], f: E[i + 5] });
  V.prev = V.cur; V.cur = { t: now, m };
  if (p.h) V.heroes = p.h.map(([id, tx, ty, tier, skin, ang], k) => {
    const H = HERO[id]; if (!H) return null;
    const key = id + '|' + (skin || ''); let look = V.look[key];
    if (!look && typeof resolveLook === 'function') look = V.look[key] = resolveLook(H, skin);
    return { id, H, tx, ty, x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2, tier, look, ang, seed: (tx * 7 + ty * 13 + k) % 17 };
  }).filter(Boolean);
  V.hp = p.hp; V.mhp = p.mhp; V.w = p.w; V.c = p.c; V.t = Date.now();
}

/* ---------- tekenen ---------- */
const _render23 = Game.prototype.render;
Game.prototype.render = function (ctx, k) {
  _render23.call(this, ctx, k);
  if (this.mode === 'race' && this.mp && App.ocv && splitOn()) { const c2 = App.ocv.getContext('2d'); if (c2) drawOppView(this, c2, App.ok || 0.5); }
};
function drawOppView(g, ctx, k) {
  const V = g.oview, o = g.opp || {}, t = g.time, name = g.mp.opp.name;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.drawImage(g.bg, 0, 0, GW, GH);
  g.drawPathFlow(ctx, t); g.drawPortal(ctx, t);
  const hp = V ? V.hp : o.hp, mhp = V ? V.mhp : o.mhp;
  g.drawBase.call({ base: g.base, hp: hp == null ? g.maxHp : hp, maxHp: mhp || g.maxHp }, ctx, t);
  if (!V || !V.cur) { viewCurtain(ctx, `Wachten op het veld van ${name}…`, ''); return; }
  // vijanden: vloeiend tussen de laatste twee beelden
  const cur = V.cur, prev = V.prev, span = prev ? Math.max(60, cur.t - prev.t) : VIEW_EVERY;
  const a = clamp((performance.now() - cur.t) / span, 0, 1);
  const ens = [];
  for (const c of cur.m.values()) {
    const q = prev && prev.m.get(c.id);
    const x = q ? q.x + (c.x - q.x) * a : c.x, y = q ? q.y + (c.y - q.y) * a : c.y;
    const dir = q && (c.x !== q.x || c.y !== q.y) ? Math.atan2(c.y - q.y, c.x - q.x) : (V.dir && V.dir[c.id]) || 0;
    (V.dir || (V.dir = {}))[c.id] = dir;
    ens.push({ c, x, y, dir });
  }
  if (V.dir && Object.keys(V.dir).length > 600) V.dir = {};
  // helden en grondvijanden op diepte gesorteerd, vliegers erboven
  const items = [];
  for (const h of V.heroes) items.push({ y: h.y, h });
  for (const e of ens) { const E = ENEMIES[e.c.type]; if (E && !E.flying) items.push({ y: e.y, e, E }); }
  items.sort((p, q) => p.y - q.y);
  for (const it of items) it.h ? viewHero(ctx, it.h, t) : viewEnemy(ctx, it.e, it.E, t);
  for (const e of ens) { const E = ENEMIES[e.c.type]; if (E && E.flying) viewEnemy(ctx, e, E, t); }
  // eigen zendingen zichtbaar bij zijn portaal
  if (g.oppFx) for (const f of g.oppFx) {
    const p = f.life / f.max; ctx.globalAlpha = Math.min(1, p * 2);
    ctx.font = "700 22px 'Barlow Condensed', 'Arial Narrow', sans-serif"; ctx.textAlign = 'center';
    const y = g.portal.y - 30 - (1 - p) * 40 - (f.k % 3) * 18;
    ctx.lineWidth = 4; ctx.strokeStyle = EDGE; ctx.strokeText(f.text, g.portal.x + 30, y); ctx.fillStyle = '#f87171'; ctx.fillText(f.text, g.portal.x + 30, y);
    ctx.globalAlpha = 1;
  }
  const stale = Date.now() - V.t > 4000;
  if (o.over === 'won' || o.over === 'lost' || g.over) return;
  if (stale) viewCurtain(ctx, `Verbinding met ${name} hapert…`, 'Het beeld komt terug zodra de verbinding er weer is.');
}
function viewHero(ctx, h, t) {
  drawHero(ctx, h.H, h.x, h.y - 4, 1, t + h.seed, { tier: h.tier, ang: h.ang, seed: h.seed, look: h.look });
  if (h.tier > 0) for (let i = 0; i < 5; i++) { ctx.fillStyle = i < h.tier ? (h.H.upgrades[i].major ? '#ffd23f' : '#ffffff') : 'rgba(255,255,255,.2)'; ctx.fillRect(h.x - 12 + i * 5, h.y + 19, 4, 3); }
}
function viewEnemy(ctx, e, E, t) {
  const c = e.c, r = E.r, fly = !!E.flying, oy = fly ? -16 : 0;
  ctx.save(); ctx.translate(e.x, e.y);
  if (c.f & 8) ctx.globalAlpha = 0.35;
  if (c.f & 2) { ctx.strokeStyle = 'rgba(248,113,113,.9)'; ctx.lineWidth = 2.5; circle(ctx, 0, oy, r * 1.45); ctx.stroke(); }
  drawEnemyBody(ctx, { type: c.type, E, r, flying: fly, dir: e.dir, boss: !!E.boss, hp: c.hp, maxHp: 100, shield: 0, maxShield: 0, healPulse: 0, t }, t + (c.id % 10));
  ctx.globalAlpha = 1;
  if (c.hp < 100) {
    const w = Math.max(18, r * 2), y = oy - r - (fly ? 8 : 9);
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(-w / 2, y, w, 4);
    ctx.fillStyle = c.hp > 50 ? '#3ddc97' : c.hp > 25 ? '#ffd23f' : '#ff4d5e'; ctx.fillRect(-w / 2, y, w * c.hp / 100, 4);
  }
  ctx.restore();
}
function viewCurtain(ctx, title, sub) {
  ctx.fillStyle = 'rgba(7,6,26,.62)'; ctx.fillRect(0, 0, GW, GH);
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = "34px Bungee, Impact, sans-serif"; ctx.fillText(title, GW / 2, GH / 2);
  if (sub) { ctx.font = "600 22px 'Barlow Condensed', sans-serif"; ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillText(sub, GW / 2, GH / 2 + 36); }
}

/* ---------- indeling ---------- */
function splitSetup(g) {
  const main = document.querySelector('#scr-game .g-main'), cbox = document.getElementById('cbox'); if (!main || !cbox) return;
  g.oppFx = [];
  const box = document.createElement('div'); box.className = 'opp-box'; box.id = 'obox';
  box.innerHTML = `<div class="ob-head"><span class="dot on" id="ob-dot"></span><b>${esc(g.mp.opp.name)}</b><span class="ob-stat" id="ob-wave">${raceWaveLbl(0, g.totalWaves)}</span><span class="ob-hp"><i id="ob-hpbar" style="width:100%"></i></span><span class="num ob-stat" id="ob-hp">${g.maxHp}</span><span class="spacer"></span><button class="btn btn-sm" data-act="split-toggle" title="Veld van je tegenstander verbergen">Verberg</button></div>
    <div class="ob-cv"><canvas id="ocv" aria-label="Veld van ${esc(g.mp.opp.name)}"></canvas></div>`;
  cbox.after(box);
  App.ocv = document.getElementById('ocv');
  const sb = document.getElementById('mp-send');
  if (sb) { const b = document.createElement('button'); b.className = 'btn btn-sm ob-show'; b.dataset.act = 'split-toggle'; b.id = 'ob-show'; b.textContent = `Toon veld van ${g.mp.opp.name}`; sb.appendChild(b); }
  splitApply();
}
function splitApply() {
  const on = splitOn(), main = document.querySelector('#scr-game .g-main'), box = document.getElementById('obox'), show = document.getElementById('ob-show');
  if (main) main.classList.toggle('split', on && !!box);
  if (box) box.hidden = !on; if (show) show.hidden = on;
  fitCanvas();
}
Object.assign(ACTIONS, { 'split-toggle': () => { Store.data.settings.splitView = !splitOn(); Store.save(); splitApply(); Sfx.play('click'); } });
const _startMatch23 = startMatch;
startMatch = function (o) {
  App.ocv = null;
  const r = _startMatch23.apply(this, arguments);
  const g = App.game; if (g && g.mode === 'race' && g.mp) splitSetup(g);
  return r;
};
const _fit23 = fitCanvas;
fitCanvas = function () {
  _fit23.apply(this, arguments);
  const cv = App.ocv, box = document.querySelector('#obox .ob-cv'); if (!cv || !box || box.closest('[hidden]')) return;
  const narrow = window.innerWidth <= 900;
  const bw = box.clientWidth - 12, bh = narrow ? bw * GH / GW : box.clientHeight - 12;
  const sc = Math.max(0.1, Math.min(bw / GW, bh / GH)), dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.floor(GW * sc), h = Math.floor(GH * sc);
  cv.style.width = w + 'px'; cv.style.height = h + 'px'; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  App.ok = cv.width / GW;
};
const _hud23 = hudUpdate;
hudUpdate = function () {
  _hud23.apply(this, arguments);
  const g = App.game; if (!g || g.mode !== 'race' || !g.mp || !App.ocv) return;
  const V = g.oview, o = g.opp || {}, hp = V && V.hp != null ? V.hp : o.hp, mhp = (V && V.mhp) || o.mhp || g.maxHp, w = V && V.w != null ? V.w : o.w;
  const set = (id, v) => { const el = document.getElementById(id); if (el && el.textContent !== String(v)) el.textContent = v; };
  set('ob-wave', raceWaveLbl(w, g.totalWaves)); set('ob-hp', hp == null ? '' : hp);
  const bar = document.getElementById('ob-hpbar'); if (bar) bar.style.width = clamp((hp == null ? mhp : hp) / mhp, 0, 1) * 100 + '%';
  const dot = document.getElementById('ob-dot'); if (dot) dot.classList.toggle('on', !!V && Date.now() - V.t < 3000);
};
const _exit23 = exitGame;
exitGame = function () { App.ocv = null; return _exit23.apply(this, arguments); };
