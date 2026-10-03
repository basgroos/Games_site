/* =====================================================================
   MAIN — game state, run flow (new run / floors / death / victory),
   interaction, rendering (tiles, entities, lighting, effects), game loop
   ===================================================================== */
const G = {
  state: 'hub', time: 0, run: null, D: null, p: null, ents: [], allies: [], proj: [], zones: [], teles: [], parts: [], texts: [], fx: [], drops: [], props: [], corpses: [], timers: [], flashLights: [],
  cam: { x: 0, y: 0 }, shake: 0, hitstop: 0, slow: 0, flashA: 0, hurtFlash: 0, darkT: 0, boss: null, bossRoom: null, curRoom: null, flow: null, flowT: 0,
  modal: null, modalData: null, pendingLevel: 0, levelChoices: null, hudDirty: true, interact: null, mx: 0, my: 0, hubTab: 'play', hubT: 0, hubParts: []
};
let cv, ctx, buf, bx, lightC, lx, SC = 3, DPR = 1, VW = 320, VH = 180;

function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  const w = innerWidth, h = innerHeight;
  cv.width = Math.round(w * DPR); cv.height = Math.round(h * DPR);
  SC = Math.max(2, Math.round(Math.min(w / 500, h / 290)));
  VW = Math.ceil(w / SC); VH = Math.ceil(h / SC);
  buf.width = VW; buf.height = VH; lightC.width = VW; lightC.height = VH;
  bx.imageSmoothingEnabled = false;
}

/* ---------------- RUN FLOW ---------------- */
function newRun(cls, bi, diff, endless) {
  Sfx.init();
  const p = makePlayer(cls), C = CLASSES[cls];
  G.p = p;
  G.run = { cls, bi, startBi: bi, floor: 1, floorNum: 1, depth: bi * 3, diff, endless, seed: (Math.random() * 4294967296) >>> 0, shards: 0, floorT: 0,
    stats: { kills: 0, dmg: 0, gold: 0, bosses: 0, floors: 0, time: 0, rooms: 0, elites: 0, secrets: 0, chests: 0, taken: 0, casts: 0 } };
  // Starting in a deeper region: catch the character up so the run is fair.
  if (bi > 0) {
    for (let i = 0; i < bi * 2; i++) { p.level++; p.ap++; p.alloc[C.primary] += 2; p.alloc.vit += 1; }
    const w = genWeapon(bi * 3 + 1, 1, C.weapon); p.equip.weapon = w;
    ['chest', 'helmet', 'boots', 'gloves', 'ring', 'amulet'].slice(0, Math.min(6, bi)).forEach(s => p.equip[s] = genArmor(bi * 3, 1, s));
    p.gold += bi * 50;
    recalc(p); p.hp = p.S.maxHp; p.mp = p.S.maxMp;
  }
  G.allies = []; G.pendingLevel = 0; G.levelChoices = null;
  enterPlay();
  startFloor();
  later(1.5, () => toast('WASD to move · hold left mouse to attack · 1-4 for abilities'));
}
function enterPlay() {
  G.state = 'play'; $('#hub').hidden = true; $('#hud').hidden = false; UI.close(); G.hudDirty = true;
}
function startFloor() {
  const R = G.run, p = G.p, B = BIOMES[R.bi];
  R.floorT = 0; R.floorHurt = false; R.curse = false;
  const isBoss = R.floor === 3;
  const seed = (R.seed + R.floorNum * 7919) >>> 0;
  G.D = genDungeon(seed, R.bi, { boss: isBoss, floorNum: R.floor, luck: p.S.luck, diff: R.diff, depth: R.depth });
  G.props = G.D.props;
  Object.assign(G, { ents: [], proj: [], zones: [], teles: [], drops: [], parts: [], texts: [], fx: [], corpses: [], timers: [], flashLights: [], boss: null, bossRoom: null, curRoom: null, flow: null, darkT: 0, interact: null });
  const s = G.D.start;
  const pos = findFree(s.cx * TS, s.cy * TS, p); p.x = pos.x; p.y = pos.y; p.vx = p.vy = 0;
  p.dashV = null; p.leap = null; p.charge = null; p.spin = null; p.flurry = null; p.status = {};
  G.allies = G.allies.filter(a => !a.dead && !a.temp); for (const a of G.allies) { a.x = p.x + rand(-10, 10); a.y = p.y + rand(-10, 10); }
  G.cam.x = p.x; G.cam.y = p.y;
  s.visited = true; revealRoom(s); G.curRoom = s;
  const mm = $('#minimap'); mm.width = G.D.w * 2; mm.height = G.D.h * 2; mm.style.height = 'auto';
  Music.play('biome' + R.bi, Object.assign({}, B.music));
  banner(B.name, isBoss ? `Floor ${R.floorNum} · Lair of ${BOSSES[B.boss].name}` : `Floor ${R.floorNum}${R.depth ? '' : ' · Find the stairs down'}`);
  Save.data.stats.bestFloor = Math.max(Save.data.stats.bestFloor, R.floorNum + R.startBi * 3);
  if (R.endless) Save.data.stats.bestEndless = Math.max(Save.data.stats.bestEndless, R.floorNum);
  saveRun();
  G.hudDirty = true;
}
function descend() {
  const R = G.run, p = G.p;
  R.stats.floors++;
  if (!R.floorHurt) unlockAch('nodamage');
  if (R.floorT < 75) unlockAch('speedrun');
  const cf = Save.data.clsFloors; cf[p.cls] = 1; if (Object.keys(CLASSES).every(k => cf[k])) unlockAch('allclasses');
  if (R.floor === 3) { R.floor = 1; R.bi = R.endless ? (R.bi + 1) % 10 : Math.min(9, R.bi + 1); } else R.floor++;
  R.floorNum++; R.depth++;
  if (R.endless && R.floorNum >= 10) unlockAch('endless10');
  Sfx.play('door'); flashScreen(.8);
  startFloor();
}
function saveRun() {
  const R = G.run, p = G.p; if (!R || !p || p.dead) return;
  const run = Object.assign({}, R);
  run.player = { level: p.level, xp: p.xp, gold: p.gold, potions: p.potions, maxPotions: p.maxPotions, alloc: p.alloc, mods: p.mods, boons: p.boons, equip: p.equip, inv: p.inv, abil: p.abil, slots: p.slots, ap: p.ap, revives: p.revives, hpf: p.hp / p.S.maxHp, bestCombo: p.bestCombo };
  Save.data.run = JSON.parse(JSON.stringify(run));
  Save.write();
}
function loadRun() {
  const r = Save.data.run; if (!r) return;
  Sfx.init();
  const p = makePlayer(r.cls);
  Object.assign(p, JSON.parse(JSON.stringify(r.player)));
  recalc(p); p.hp = Math.max(1, p.S.maxHp * (r.player.hpf || 1)); p.mp = p.S.maxMp;
  G.p = p;
  const run = Object.assign({}, r); delete run.player; G.run = run;
  G.allies = []; G.pendingLevel = 0; G.levelChoices = null;
  enterPlay(); startFloor();
}
function endRun(type, abandoned = false) {
  const R = G.run, p = G.p; if (!R) return;
  const s = R.stats;
  let shards = (s.kills * .4 + s.floors * 6 + s.bosses * 30 + R.depth * 2) * DIFFS[R.diff].shards * (type === 'victory' ? 1.5 : type === 'return' ? 1.2 : 1);
  if (abandoned) shards *= .5;
  shards = Math.round(shards) + R.shards;
  const S = Save.data;
  S.shards += shards; S.totalShards += shards; S.stats.runs++;
  if (type === 'death') S.stats.deaths++;
  if (type === 'victory') { S.stats.victories++; unlockAch('victory'); }
  S.run = null; Save.write();
  G.state = 'ended'; G.boss = null;
  Music.stop();
  UI.open('end', { type, run: R, shards, level: p.level });
}
function toHub() {
  G.state = 'hub'; G.run = null; G.p = null; G.D = null; G.boss = null; G.modal = null;
  $('#hud').hidden = true; $('#hub').hidden = false; $('#modal').hidden = true;
  Music.play('hub', HUB_MUSIC);
  renderHub();
}

/* ---------------- INTERACTION ---------------- */
const INTERACT_LABEL = {
  chest: pp => pp.big ? 'Open the treasure chest' : 'Open chest', fountain: () => 'Drink from the fountain (full heal)', shrine: () => 'Pray at the shrine', gamble: () => "Use the Gambler's Idol",
  cursed: () => 'Inspect the cursed chest', merchant: () => 'Talk to the merchant', altar: () => 'Examine the altar', shopkeeper: () => 'Browse the shop',
  stairs: pp => pp.bossStairs ? `Descend to ${G.run.endless || G.run.bi < 9 ? BIOMES[G.run.endless ? (G.run.bi + 1) % 10 : G.run.bi + 1].name : 'the depths'}` : 'Descend the stairs',
  portal: pp => pp.final ? 'Step through the portal and finish the run' : 'Take the portal back to camp (keeps your shards)', orb: () => 'Take the power-up'
};
function findInteract() {
  const p = G.p; let best = null, bd = 22;
  for (const d of G.drops) if (d.kind === 'item' && d.t > .3) { const dd = Math.hypot(d.x - p.x, d.y - p.y); if (dd < bd) { bd = dd; best = { kind: 'drop', d, label: `Pick up ${d.item.name}`, color: RARITIES[d.item.rar].color }; } }
  for (const pp of G.props) {
    const f = INTERACT_LABEL[pp.type]; if (!f || pp.dead) continue;
    if (pp.used && ['chest', 'fountain', 'shrine', 'cursed', 'altar'].includes(pp.type)) continue;
    const dd = Math.hypot(pp.x - p.x, pp.y - p.y) - (pp.r || 4);
    if (dd < bd) { bd = dd; best = { kind: 'prop', pp, label: f(pp) }; }
  }
  return best;
}
function doInteract(t) {
  const p = G.p;
  if (t.kind === 'drop') { if (p.inv.length >= 24) { toast('Backpack full — sell or drop something (I)'); Sfx.play('error'); return; } p.inv.push(t.d.item); t.d.dead = true; G.drops = G.drops.filter(d => d !== t.d); Sfx.play('pickup'); toast(`Picked up ${t.d.item.name}`, 'r' + t.d.item.rar); return; }
  const pp = t.pp;
  switch (pp.type) {
    case 'chest': openChest(pp); break;
    case 'fountain': pp.used = true; healPlayer(p.S.maxHp); p.mp = p.S.maxMp; if (p.potions < p.maxPotions) p.potions++; p.status = {}; fxBurst(pp.x, pp.y - 8, '#8ad0ff', 40, 80); Sfx.play('heal'); toast('Fully healed and a potion refilled'); break;
    case 'shopkeeper': UI.open('shop', pp); break;
    case 'shrine': case 'gamble': case 'cursed': case 'merchant': case 'altar': UI.open('event', pp); break;
    case 'stairs': { const q = roomAt(pp.x, pp.y); if (q && !q.cleared && !pp.bossStairs) { toast('Defeat the monsters in this room first'); Sfx.play('error'); return; } descend(); break; }
    case 'portal': endRun(pp.final ? 'victory' : 'return'); break;
    case 'orb': pp.dead = true; grantBoon(chance(.3 + p.S.lf * .3)); break;
  }
}
function openChest(pp) {
  if (pp.used) return;
  const R = G.run, p = G.p, lf = p.S.lf;
  if (pp.mimic) {
    pp.dead = true; pp.type = 'gone';
    const q = roomAt(pp.x, pp.y);
    const e = spawnEnemy('mimic', pp.x, pp.y, { room: q ? q.id : -1, delay: 0 }); wakeMimic(e);
    return;
  }
  pp.used = true; pp.openT = 0;
  Sfx.play('chest'); fxBurst(pp.x, pp.y - 6, '#ffe080', 24, 80);
  R.stats.chests++; Save.data.stats.chests++; if (Save.data.stats.chests >= 40) unlockAch('treasure');
  const n = pp.big ? 2 + (chance(lf) ? 1 : 0) : 1 + (chance(lf * .6) ? 1 : 0);
  for (let i = 0; i < n; i++) later(.15 + i * .15, () => dropItem(pp.x + rand(-8, 8), pp.y + 8, genItem({ minR: Math.min(5, (pp.big ? 1 : 0) + (pp.minR || 0)), bonus: (pp.big ? 8 : 0) + (pp.bonus || 0) })));
  dropGold(pp.x, pp.y + 6, randi(8, 16) * (1 + R.depth * .25) * (pp.big ? 2.5 : 1) * p.S.goldMult * (1 + lf * .8));
  if (chance((pp.big ? .35 : .08) * (1 + lf))) later(.5, () => dropBoon(pp.x, pp.y + 8));
  if (chance(.15 * DIFFS[R.diff].heal)) dropPickup(pp.x, pp.y + 6, 'potion');
}

/* ---------------- UPDATE ---------------- */
function update(dt) {
  const R = G.run, p = G.p;
  G.time += dt; R.stats.time += dt; R.floorT += dt;
  if (G.timers.length) { const due = G.timers.filter(t => (t.t -= dt) <= 0); G.timers = G.timers.filter(t => t.t > 0); for (const t of due) t.fn(); }
  G.mx = G.cam.x - VW / 2 + Input.mouse.x / SC; G.my = G.cam.y - VH / 2 + Input.mouse.y / SC;
  G.flowT -= dt; if (G.flowT <= 0) { G.flowT = .25; computeFlow(p.x, p.y); }
  if (!p.dead) updatePlayer(p, dt);
  for (const e of G.ents) if (!e.dead) updateEnemy(e, dt);
  // soft separation between enemies so crowds don't stack
  const E = G.ents;
  for (let i = 0; i < E.length; i++) { const a = E[i]; if (a.dead || a.spawnT > 0) continue; for (let j = i + 1; j < E.length; j++) { const b = E[j]; if (b.dead || b.spawnT > 0) continue; const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r, d2 = dx * dx + dy * dy; if (d2 < rr * rr && d2 > .01) { const d = Math.sqrt(d2), push = (rr - d) / 2, nx = dx / d, ny = dy / d; if (!a.boss) moveEnt(a, -nx * push, -ny * push); if (!b.boss) moveEnt(b, nx * push, ny * push); } } }
  G.ents = G.ents.filter(e => !e.dead);
  for (const a of G.allies) if (!a.dead) updateAlly(a, dt);
  G.allies = G.allies.filter(a => !a.dead);
  updateProjectiles(dt); updateZones(dt); updateTeles(dt); updateDrops(dt); updateProps(dt);
  for (const pt of G.parts) { pt.life -= dt; pt.vy += pt.grav * dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vx *= .96; if (!pt.grav) pt.vy *= .96; }
  G.parts = G.parts.filter(pt => pt.life > 0); if (G.parts.length > 1400) G.parts.splice(0, G.parts.length - 1400);
  for (const t of G.texts) { t.t += dt; t.y -= (t.big ? 26 : 20) * dt; t.x += t.vx * dt; }
  G.texts = G.texts.filter(t => t.t < t.dur);
  for (const f of G.fx) f.t += dt; G.fx = G.fx.filter(f => f.t < f.dur);
  for (const l of G.flashLights) l.t -= dt; G.flashLights = G.flashLights.filter(l => l.t > 0);
  for (const c of G.corpses) c.t += dt; G.corpses = G.corpses.filter(c => c.t < 30);
  if (!p.dead) updateRooms();
  // camera follows the player with a small lead toward the cursor
  const tx = p.x + (G.mx - p.x) * .16, ty = p.y + (G.my - p.y) * .16;
  G.cam.x = lerp(G.cam.x, tx, Math.min(1, dt * 8)); G.cam.y = lerp(G.cam.y, ty, Math.min(1, dt * 8));
  reveal(Math.floor(p.x / TS), Math.floor(p.y / TS), 5);
  G.interact = p.dead ? null : findInteract();
  if (Input.tap('KeyE') && G.interact && !G.modal) doInteract(G.interact);
  G.shake = Math.max(0, G.shake - dt * 22);
  G.hurtFlash = Math.max(0, G.hurtFlash - dt);
  G.darkT = Math.max(0, G.darkT - dt);
  if (G.streakMsg) G.streakMsg.t -= dt;
  G.mmT = (G.mmT || 0) - dt; if (G.mmT <= 0) { G.mmT = .15; drawMap($('#minimap'), 2, false); }
}

/* ---------------- RENDER ---------------- */
const PROP_PAL = {
  chest: PAL({ 2: '#8a5a2a', 3: '#5a3a1a', 7: '#b8bcc4', 4: '#3a2410', 5: '#ffe080' }), big: PAL({ 2: '#7a3a2a', 3: '#4a2018', 7: '#f0c040', 4: '#3a2410', 5: '#ffe080' }),
  cursed: PAL({ 2: '#3a1a4a', 3: '#20102a', 7: '#8a50c0', 4: '#1a0a20', 5: '#c080ff' }),
  barrel: PAL({ 2: '#7a5230', 3: '#5a3a20', 7: '#8a8a90' }), xbarrel: PAL({ 2: '#a02a1a', 3: '#6a1a10', 7: '#2a2a2a' }), crate: PAL({ 2: '#9a7040', 3: '#6a4a28', 7: '#5a3a20' }),
  fountain: PAL({ 7: '#8a8a9a', 4: '#4a9ad8' }), shrine: PAL({ 7: '#6a5a6a', 5: '#ff3a4a' }), altar: PAL({ 7: '#6a5a6a', 3: '#3a2a3a', 5: '#ff6040' }), gamble: PAL({ 7: '#b08a30', 3: '#6a5020', 5: '#ffe060' }),
  shopkeeper: PAL({ 2: '#8a3a2a', 6: '#c89040', 4: '#6a2a1a', 3: '#3a2a1a' }), merchant: PAL({ 2: '#3a1a5a', 8: '#1a1220', 5: '#e0c0ff', 6: '#2a1a4a', 4: '#c0a0ff', 3: '#1a1020' })
};
const GLOW_DECOR = { candle: '255,180,80', mushroom: '90,230,160', crystal: '120,210,255', ember: '255,120,40', wisp: '180,120,255' };
function entSprite(e) {
  if (!e.spr) { const pal = e.team === 'ally' ? Object.assign({}, e.def.pal, { 5: '#9fff7a' }) : e.def.pal; e.spr = makeSprite(e.def.tpl, pal); if (e.def.tpl === 'bat') e.spr2 = makeSprite('bat2', pal); }
  return e.spr;
}
function shadow(x, y, w) { bx.fillStyle = 'rgba(0,0,0,.35)'; bx.beginPath(); bx.ellipse(Math.round(x), Math.round(y), w, w * .4, 0, 0, TAU); bx.fill(); }
function renderWorld() {
  const D = G.D, R = G.run, p = G.p, B = BIOMES[R.bi], T = getTiles(R.bi);
  bx.setTransform(1, 0, 0, 1, 0, 0); bx.globalAlpha = 1; bx.globalCompositeOperation = 'source-over';
  bx.fillStyle = '#000'; bx.fillRect(0, 0, VW, VH);
  const sx = G.shake > 0 ? rand(-1, 1) * G.shake : 0, sy = G.shake > 0 ? rand(-1, 1) * G.shake : 0;
  const ox = Math.round(G.cam.x - VW / 2 + sx), oy = Math.round(G.cam.y - VH / 2 + sy);
  G.ox = ox; G.oy = oy;
  bx.save(); bx.translate(-ox, -oy);
  const tx0 = Math.max(0, Math.floor(ox / TS) - 1), tx1 = Math.min(D.w - 1, Math.floor((ox + VW) / TS) + 1);
  const ty0 = Math.max(0, Math.floor(oy / TS) - 1), ty1 = Math.min(D.h - 1, Math.floor((oy + VH) / TS) + 2);
  const lf = Math.floor(G.time * 3);
  const lights = [], glows = [];
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const i = ty * D.w + tx; if (!D.explored[i]) continue;
    const t = D.t[i], X = tx * TS, Y = ty * TS;
    if (t === T_FLOOR || t === T_DOOR) {
      bx.drawImage(T.floors[Math.floor(hash2(tx, ty, D.seed) * 5)], X, Y);
      if (D.deco[i]) { const dn = B.decor[D.deco[i] - 1]; bx.drawImage(T.decor[dn], X, Y); if (GLOW_DECOR[dn]) { lights.push([X + 8, Y + 8, 24]); glows.push([X + 8, Y + 8, 14, GLOW_DECOR[dn], .35]); } }
      if (isSolidT(tileAt(tx, ty - 1)) && tileAt(tx, ty - 1) !== T_DOOR) { bx.fillStyle = 'rgba(0,0,0,.35)'; bx.fillRect(X, Y, TS, 3); }
      if (t === T_DOOR) bx.drawImage(T.door, X, Y);
    } else if (t === T_LIQ) {
      bx.drawImage(T.liq[(lf + tx * 7 + ty * 3) % 3], X, Y);
      if (!(tileAt(tx, ty - 1) === T_LIQ)) { bx.fillStyle = 'rgba(0,0,0,.25)'; bx.fillRect(X, Y, TS, 2); }
      if (B.liquid === 'lava' && (tx + ty) % 2 === 0) { lights.push([X + 8, Y + 8, 26]); glows.push([X + 8, Y + 8, 18, '255,110,30', .3]); }
      if (B.liquid === 'void' && (tx + ty) % 3 === 0) glows.push([X + 8, Y + 8, 14, '150,90,255', .25]);
    } else {
      const below = tileAt(tx, ty + 1);
      if (t === T_CRACK) bx.drawImage(T.crack, X, Y);
      else if (!isSolidT(below) || below === T_DOOR) bx.drawImage(T.wallFace, X, Y);
      else bx.drawImage(T.wallTop, X, Y);
    }
  }
  const seen = (x, y) => D.explored[Math.floor(y / TS) * D.w + Math.floor(x / TS)];
  const inView = (x, y, m = 40) => x > ox - m && x < ox + VW + m && y > oy - m && y < oy + VH + m;
  // ground layer: zones, telegraphs, corpses, floor props
  for (const z of G.zones) {
    if (!inView(z.x, z.y, z.r)) continue;
    const c = ZONE_COL[z.kind] || '255,255,255', k = 1 - z.t / z.dur;
    if (z.kind === 'trap') { bx.fillStyle = '#6a5a4a'; bx.fillRect(Math.round(z.x) - 5, Math.round(z.y) - 2, 10, 4); bx.fillStyle = '#c8c0b0'; for (let i = -4; i <= 4; i += 2) bx.fillRect(Math.round(z.x) + i, Math.round(z.y) - 4, 1, 2); continue; }
    bx.fillStyle = `rgba(${c},${z.kind === 'ink' ? .55 : .16 + .08 * Math.sin(G.time * 6)})`;
    bx.beginPath(); bx.arc(z.x, z.y, z.r * (z.kind === 'holy' ? 1 : .96 + .04 * Math.sin(G.time * 4)), 0, TAU); bx.fill();
    bx.strokeStyle = `rgba(${c},${.45 * Math.min(1, k * 3)})`; bx.lineWidth = 1; bx.stroke();
    if (['fire', 'lava', 'holy'].includes(z.kind)) { lights.push([z.x, z.y, z.r * 1.4]); glows.push([z.x, z.y, z.r, c, .3]); }
  }
  for (const o of G.teles) {
    const k = Math.min(1, o.t / o.dur), c = o.color;
    bx.save(); bx.fillStyle = `rgba(${c},${.12 + .1 * k})`; bx.strokeStyle = `rgba(${c},${.55 + .3 * k})`; bx.lineWidth = 1;
    if (o.kind === 'circle') { bx.beginPath(); bx.arc(o.x, o.y, o.r, 0, TAU); bx.fill(); bx.stroke(); bx.fillStyle = `rgba(${c},.28)`; bx.beginPath(); bx.arc(o.x, o.y, o.r * k, 0, TAU); bx.fill(); }
    else if (o.kind === 'line') { bx.translate(o.x, o.y); bx.rotate(o.ang); bx.fillRect(0, -o.w / 2, o.len, o.w); bx.strokeRect(0, -o.w / 2, o.len, o.w); bx.fillStyle = `rgba(${c},.28)`; bx.fillRect(0, -o.w / 2, o.len * k, o.w); }
    else if (o.kind === 'cone') { bx.beginPath(); bx.moveTo(o.x, o.y); bx.arc(o.x, o.y, o.len, o.ang - o.arc / 2, o.ang + o.arc / 2); bx.closePath(); bx.fill(); bx.stroke(); bx.fillStyle = `rgba(${c},.28)`; bx.beginPath(); bx.moveTo(o.x, o.y); bx.arc(o.x, o.y, o.len * k, o.ang - o.arc / 2, o.ang + o.arc / 2); bx.closePath(); bx.fill(); }
    bx.restore();
  }
  for (const c of G.corpses) { if (!inView(c.x, c.y) || !seen(c.x, c.y)) continue; bx.globalAlpha = Math.min(1, (30 - c.t) / 3) * .8; bx.fillStyle = '#5a1a1a'; bx.fillRect(Math.round(c.x) - 4, Math.round(c.y) + 1, 8, 2); bx.fillStyle = '#c8c0b0'; bx.fillRect(Math.round(c.x) - 2, Math.round(c.y), 3, 1); bx.fillRect(Math.round(c.x) + 1, Math.round(c.y) + 1, 2, 1); bx.globalAlpha = 1; }
  // entities, sorted by y
  const list = [];
  for (const pp of G.props) if (inView(pp.x, pp.y) && seen(pp.x, pp.y) && pp.type !== 'gone') list.push([pp.type === 'torch' ? -1e9 : ['spikes', 'vent', 'stairs', 'portal'].includes(pp.type) ? pp.y - 1000 : pp.y, 0, pp]);
  for (const d of G.drops) if (inView(d.x, d.y) && seen(d.x, d.y)) list.push([d.y, 1, d]);
  for (const e of G.ents) if (inView(e.x, e.y, 60) && (seen(e.x, e.y) || e.boss)) list.push([e.y, 2, e]);
  for (const a of G.allies) if (inView(a.x, a.y)) list.push([a.y, 3, a]);
  if (!p.dead || G.state === 'dying') list.push([p.y, 4, p]);
  list.sort((a, b) => a[0] - b[0]);
  for (const [, k, o] of list) {
    if (k === 0) drawProp(o, lights, glows);
    else if (k === 1) drawDrop(o, lights, glows);
    else if (k === 2) drawEnemy(o, lights, glows);
    else if (k === 3) drawAlly(o);
    else drawPlayer(o);
  }
  // projectiles
  for (const pr of G.proj) {
    if (!inView(pr.x, pr.y)) continue;
    const col = pr.color && pr.team === 'player' && pr.kind !== 'fireball' ? pr.color : PROJ_COL[pr.kind] || '#fff';
    const a = Math.atan2(pr.vy, pr.vx), X = Math.round(pr.x), Y = Math.round(pr.y);
    if (['arrow', 'bone', 'knife', 'thorn'].includes(pr.kind)) {
      const L = pr.kind === 'bone' ? 7 : pr.kind === 'knife' ? 4 : 5;
      bx.strokeStyle = col; bx.lineWidth = pr.kind === 'bone' ? 2 : 1; bx.beginPath(); bx.moveTo(X - Math.cos(a) * L, Y - Math.sin(a) * L); bx.lineTo(X, Y); bx.stroke();
      bx.fillStyle = '#fff'; bx.fillRect(X, Y, 1, 1);
    } else {
      const r = Math.max(1.5, pr.r);
      bx.fillStyle = col; bx.beginPath(); bx.arc(X, Y, r, 0, TAU); bx.fill();
      bx.fillStyle = '#fff'; bx.fillRect(X - 1, Y - 1, 2, 2);
    }
    lights.push([pr.x, pr.y, pr.kind === 'fireball' ? 40 : 20]);
    glows.push([pr.x, pr.y, pr.kind === 'fireball' ? 20 : 10, hexToRgb(col), .45]);
  }
  // effects
  for (const f of G.fx) drawFx(f, lights, glows);
  // particles
  for (const pt of G.parts) { if (!inView(pt.x, pt.y, 10)) continue; bx.globalAlpha = Math.min(1, pt.life / pt.max * 1.5); bx.fillStyle = pt.color; bx.fillRect(Math.round(pt.x), Math.round(pt.y), pt.size, pt.size); }
  bx.globalAlpha = 1;
  // lights from props & player
  const dk = G.darkT > 0 ? .55 : 1;
  lights.push([p.x, p.y - 4, (p.stealth > 0 ? 70 : 100) * dk]);
  for (const l of G.flashLights) lights.push([l.x, l.y, l.r]);
  if (G.boss) lights.push([G.boss.x, G.boss.y - 20, 70]);
  bx.restore();
  // --- darkness mask with light holes ---
  lx.globalCompositeOperation = 'source-over'; lx.clearRect(0, 0, VW, VH);
  const dark = Math.min(.96, B.dark + (G.darkT > 0 ? .08 : 0));
  lx.fillStyle = `rgba(4,2,9,${dark})`; lx.fillRect(0, 0, VW, VH);
  lx.globalCompositeOperation = 'destination-out';
  const Lw = lightSprite();
  for (const [x, y, r] of lights) { if (x < ox - r || x > ox + VW + r || y < oy - r || y > oy + VH + r) continue; lx.drawImage(Lw, x - ox - r, y - oy - r, r * 2, r * 2); }
  bx.drawImage(lightC, 0, 0);
  // coloured additive glows
  bx.globalCompositeOperation = 'lighter';
  for (const [x, y, r, c, a] of glows) { if (x < ox - r || x > ox + VW + r || y < oy - r || y > oy + VH + r) continue; bx.globalAlpha = a; bx.drawImage(lightSprite(c), x - ox - r, y - oy - r, r * 2, r * 2); }
  bx.globalAlpha = .06; bx.drawImage(lightSprite(B.light), p.x - ox - 90, p.y - oy - 94, 180, 180);
  bx.globalAlpha = 1; bx.globalCompositeOperation = 'source-over';
  // item labels & floating texts (drawn above the lighting)
  bx.save(); bx.translate(-ox, -oy);
  bx.textAlign = 'center'; bx.textBaseline = 'middle';
  for (const d of G.drops) if (d.kind === 'item' && Math.hypot(d.x - p.x, d.y - p.y) < 46) pixText(d.item.name, d.x, d.y - 14 - d.z, RARITIES[d.item.rar].color, 8);
  for (const e of G.ents) if (e.elite && !e.dead && e.spawnT <= 0 && !e.boss && Math.hypot(e.x - p.x, e.y - p.y) < 110 && seen(e.x, e.y)) pixText(e.name, e.x, e.y - 18 * e.scale - 8, ELITE_MODS[e.elite[0]].c, 8);
  for (const t of G.texts) { const k = t.t / t.dur; bx.globalAlpha = k > .7 ? (1 - k) / .3 : 1; pixText(t.text, t.x, t.y, t.color, t.big ? 16 : 8); }
  bx.globalAlpha = 1;
  bx.restore();
  if (G.state === 'dying') { bx.fillStyle = `rgba(60,0,0,${.5 * (1 - G.dyingT / 1.8)})`; bx.fillRect(0, 0, VW, VH); }
}
function pixText(s, x, y, col, size) {
  bx.font = `${size}px Silkscreen, monospace`;
  bx.fillStyle = '#000'; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1]]) bx.fillText(s, Math.round(x) + dx, Math.round(y) + dy);
  bx.fillStyle = col; bx.fillText(s, Math.round(x), Math.round(y));
}
function hexToRgb(h) { if (!h || h[0] !== '#') return '255,255,255'; const n = parseInt(h.length === 4 ? h[1] + h[1] + h[2] + h[2] + h[3] + h[3] : h.slice(1, 7), 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; }
function drawProp(pp, lights, glows) {
  const X = Math.round(pp.x), Y = Math.round(pp.y);
  switch (pp.type) {
    case 'torch': {
      const fy = Y - 4; bx.fillStyle = '#3a2a1a'; bx.fillRect(X - 1, fy, 2, 5); bx.fillStyle = '#6a5a4a'; bx.fillRect(X - 2, fy, 4, 1);
      const fl = Math.sin(G.time * 18 + pp.uid) > 0;
      bx.fillStyle = '#ff8a20'; bx.fillRect(X - 1, fy - 3, 3, 3); bx.fillStyle = '#ffe070'; bx.fillRect(X, fy - (fl ? 4 : 3), 1, 2);
      const r = 74 + Math.sin(G.time * 9 + pp.uid) * 4;
      lights.push([X, fy, r]); glows.push([X, fy, 34, BIOMES[G.run.bi].light, .32]);
      return;
    }
    case 'spikes': {
      bx.fillStyle = '#2a2430'; bx.fillRect(X - 6, Y - 5, 12, 10); bx.fillStyle = '#4a4252'; bx.fillRect(X - 5, Y - 4, 10, 8);
      for (let i = -4; i <= 4; i += 3) for (let j = -3; j <= 3; j += 3) {
        if (pp.state === 2) { bx.fillStyle = '#d8dce4'; bx.fillRect(X + i, Y + j - 4, 1, 4); bx.fillStyle = '#8a8e98'; bx.fillRect(X + i + 1, Y + j - 2, 1, 2); }
        else { bx.fillStyle = pp.state === 1 ? '#a8acb4' : '#1a1620'; bx.fillRect(X + i, Y + j, 1, 1); }
      }
      return;
    }
    case 'vent': {
      bx.fillStyle = '#2a1a16'; bx.fillRect(X - 6, Y - 5, 12, 10); bx.fillStyle = pp.state ? '#ff7a2a' : '#4a2a1a';
      for (let i = -4; i <= 4; i += 2) bx.fillRect(X + i, Y - 4, 1, 8);
      if (pp.state === 2) { lights.push([X, Y - 10, 50]); glows.push([X, Y - 10, 26, '255,120,40', .5]); }
      return;
    }
    case 'arrowtrap': bx.fillStyle = '#0b0810'; bx.fillRect(X - 2, Y + 3, 4, 3); bx.fillStyle = '#6a5a4a'; bx.fillRect(X - 3, Y + 2, 6, 1); return;
    case 'stairs': {
      bx.fillStyle = '#050307'; bx.fillRect(X - 9, Y - 9, 18, 16);
      for (let i = 0; i < 4; i++) { bx.fillStyle = ['#5a5060', '#443c4a', '#2e2834', '#1a1620'][i]; bx.fillRect(X - 8, Y - 8 + i * 4, 16, 3); }
      bx.strokeStyle = '#8a7a60'; bx.lineWidth = 1; bx.strokeRect(X - 9.5, Y - 9.5, 19, 17);
      lights.push([X, Y, 44]); glows.push([X, Y, 20, '255,210,140', .25]);
      return;
    }
    case 'portal': {
      const t = G.time;
      for (let i = 0; i < 5; i++) { bx.strokeStyle = `rgba(${pp.final ? '255,220,140' : '140,200,255'},${.9 - i * .15})`; bx.lineWidth = 1; bx.beginPath(); bx.ellipse(X, Y - 10, 8 - i + Math.sin(t * 4 + i) * .6, 12 - i * 1.5, 0, 0, TAU); bx.stroke(); }
      bx.fillStyle = pp.final ? 'rgba(255,230,160,.35)' : 'rgba(120,180,255,.35)'; bx.beginPath(); bx.ellipse(X, Y - 10, 6, 9, 0, 0, TAU); bx.fill();
      lights.push([X, Y - 10, 70]); glows.push([X, Y - 10, 30, pp.final ? '255,220,140' : '120,190,255', .6]);
      return;
    }
    case 'orb': {
      const yy = Y - 8 + Math.sin(G.time * 3) * 2;
      shadow(X, Y + 2, 4); bx.drawImage(itemIcon('orb', '#ff9aff').cv, X - 8, Math.round(yy) - 8);
      lights.push([X, yy, 40]); glows.push([X, yy, 18, '255,150,255', .6]);
      return;
    }
    case 'chest': {
      const pal = pp.big ? PROP_PAL.big : PROP_PAL.chest;
      const spr = makeSprite(pp.used ? 'chestOpen' : 'chest', pal);
      const sc = pp.pop > 0 ? 1 + pp.pop * .8 : 1;
      shadow(X, Y + 3, 7);
      drawSpr(bx, spr, X, Y + 4, sc);
      if (!pp.used) { lights.push([X, Y - 4, 26]); if (Math.random() < .05) G.parts.push(part(X + rand(-6, 6), Y - rand(2, 10), 0, -10, .6, '#ffe080', 1, true)); }
      return;
    }
    case 'barrel': case 'crate': case 'xbarrel': shadow(X, Y + 3, 6); drawSpr(bx, makeSprite(pp.type === 'crate' ? 'crate' : 'barrel', PROP_PAL[pp.type]), X, Y + 4); return;
    case 'fountain': { shadow(X, Y + 4, 10); drawSpr(bx, makeSprite('fountain', pp.used ? PAL({ 7: '#5a5a66', 4: '#2a3a4a' }) : PROP_PAL.fountain), X, Y + 6); if (!pp.used) { lights.push([X, Y - 6, 50]); glows.push([X, Y - 6, 24, '90,170,255', .45]); if (Math.random() < .3) G.parts.push(part(X + rand(-2, 2), Y - 14, rand(-10, 10), -rand(20, 40), .6, '#8ad0ff', 1, true, 120)); } return; }
    case 'shrine': shadow(X, Y + 3, 7); drawSpr(bx, makeSprite('shrine', pp.used ? PAL({ 7: '#4a4050', 5: '#3a2a30' }) : PROP_PAL.shrine), X, Y + 4); if (!pp.used) { lights.push([X, Y - 8, 40]); glows.push([X, Y - 8, 20, '255,60,80', .45]); } return;
    case 'gamble': shadow(X, Y + 3, 7); drawSpr(bx, makeSprite('altar', PROP_PAL.gamble), X, Y + 4); lights.push([X, Y - 6, 40]); glows.push([X, Y - 6, 20, '255,210,80', .45]); return;
    case 'altar': shadow(X, Y + 3, 7); drawSpr(bx, makeSprite('altar', PROP_PAL.altar), X, Y + 4); lights.push([X, Y - 6, 40]); glows.push([X, Y - 6, 20, '255,80,60', .4]); return;
    case 'cursed': shadow(X, Y + 3, 7); drawSpr(bx, makeSprite(pp.used ? 'chestOpen' : 'chest', PROP_PAL.cursed), X, Y + 4); if (!pp.used) { bx.strokeStyle = '#6a6070'; bx.beginPath(); bx.moveTo(X - 7, Y - 8); bx.lineTo(X + 7, Y + 1); bx.moveTo(X + 7, Y - 8); bx.lineTo(X - 7, Y + 1); bx.stroke(); glows.push([X, Y - 4, 20, '170,90,255', .45]); } lights.push([X, Y - 4, 34]); return;
    case 'shopkeeper': case 'merchant': {
      if (pp.type === 'shopkeeper') { bx.fillStyle = '#5a2a2a'; bx.fillRect(X - 14, Y - 2, 28, 10); bx.fillStyle = '#8a4a3a'; bx.fillRect(X - 13, Y - 1, 26, 8); bx.fillStyle = '#c8a040'; bx.fillRect(X - 10, Y + 1, 3, 3); bx.fillRect(X + 7, Y + 1, 3, 3); }
      shadow(X, Y + 2, 5); drawSpr(bx, makeSprite('human', PROP_PAL[pp.type]), X, Y + 3 + Math.round(Math.sin(G.time * 2) * .6), 1, G.p.x < X);
      lights.push([X, Y - 8, 50]); glows.push([X, Y - 8, 24, pp.type === 'merchant' ? '180,120,255' : '255,200,120', .35]);
      if (Math.hypot(G.p.x - X, G.p.y - Y) < 70) pixText(pp.type === 'merchant' ? '?' : '$', X, Y - 22 + Math.sin(G.time * 4) * 1.5, '#ffe080', 8);
      return;
    }
  }
}
function drawDrop(d, lights, glows) {
  const X = Math.round(d.x), Y = Math.round(d.y - d.z);
  shadow(d.x, d.y + 2, 3);
  if (d.kind === 'gold') { bx.fillStyle = '#8a6010'; bx.fillRect(X - 2, Y - 2, 4, 3); bx.fillStyle = Math.sin(G.time * 8 + d.uid) > .6 ? '#fff4b0' : '#ffd040'; bx.fillRect(X - 1, Y - 2, 2, 2); return; }
  if (d.kind === 'heart') { bx.fillStyle = '#e03a3a'; bx.fillRect(X - 2, Y - 3, 2, 2); bx.fillRect(X + 1, Y - 3, 2, 2); bx.fillRect(X - 2, Y - 2, 5, 2); bx.fillRect(X - 1, Y, 3, 1); bx.fillRect(X, Y + 1, 1, 1); glows.push([X, Y, 10, '255,80,80', .3]); return; }
  if (d.kind === 'potion') { bx.drawImage(itemIcon('potion', '#e04a4a').cv, X - 8, Y - 12); return; }
  if (d.kind === 'shard') { bx.fillStyle = '#bfe8ff'; bx.fillRect(X - 1, Y - 6, 3, 7); bx.fillStyle = '#fff'; bx.fillRect(X, Y - 5, 1, 3); lights.push([X, Y, 30]); glows.push([X, Y - 3, 16, '150,220,255', .6]); return; }
  if (d.kind === 'boon') { const yy = Y - 5 + Math.sin(G.time * 4 + d.uid) * 1.5; bx.drawImage(itemIcon('orb', d.rare ? '#e080ff' : '#ffe080').cv, X - 8, Math.round(yy) - 8); lights.push([X, yy, 34]); glows.push([X, yy, 16, d.rare ? '230,130,255' : '255,220,120', .55]); return; }
  if (d.kind === 'item') {
    const it = d.item, col = RARITIES[it.rar].color;
    if (it.rar >= 2) {
      const h = 10 + it.rar * 6;
      const g = bx.createLinearGradient(0, Y - h - 6, 0, Y);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, col + '88');
      bx.fillStyle = g; bx.fillRect(X - 1, Y - h - 6, 3, h);
      lights.push([X, Y - 4, 16 + it.rar * 5]); glows.push([X, Y - 4, 10 + it.rar * 3, hexToRgb(col), .5]);
    }
    const yy = Y - 4 + Math.sin(G.time * 3 + d.uid) * 1;
    bx.drawImage(itemIcon(it.type, col).cv, X - 8, Math.round(yy) - 10);
  }
}
function drawEnemy(e, lights, glows) {
  const X = Math.round(e.x), Y = Math.round(e.y);
  if (e.spawnT > 0) return;
  if (e.dormant) { shadow(X, Y + 3, 7); drawSpr(bx, makeSprite('chest', PROP_PAL.chest), X, Y + 4); lights.push([X, Y - 4, 26]); return; }
  let spr = entSprite(e);
  if (e.def.tpl === 'bat' && Math.floor(e.t * 10) % 2) spr = e.spr2;
  const sc = e.scale * (e.boss ? e.def.scale : 1);
  if (e.boss && e.hidden > 0) { for (let i = 0; i < 3; i++) { bx.strokeStyle = `rgba(120,220,240,${.5 - i * .15})`; bx.beginPath(); bx.ellipse(X, Y, 10 + i * 6 + Math.sin(G.time * 5) * 2, 4 + i * 2, 0, 0, TAU); bx.stroke(); } return; }
  const airOff = e.boss && e.air > 0 ? 60 : 0;
  shadow(X, Y + 3, (e.r + 2) * (airOff ? .7 : 1));
  let bob = e.moving ? Math.round(Math.abs(Math.sin(e.t * 10))) : 0;
  if (e.def.fly) bob = Math.round(Math.sin(e.t * 5) * 2) - 3;
  if (e.def.ai === 'slime' && e.hop > 0) bob = -Math.round(Math.sin(e.hop / .3 * Math.PI) * 5);
  let lunge = 0; if (e.lunge > 0) { e.lunge -= 1 / 60; lunge = 3; }
  const lx2 = lunge && e.windAng !== undefined ? Math.round(Math.cos(e.windAng) * lunge) : 0;
  // elite aura
  if (e.elite) { const c = ELITE_MODS[e.elite[0]].c; bx.strokeStyle = c; bx.globalAlpha = .5 + .3 * Math.sin(G.time * 6); bx.beginPath(); bx.ellipse(X, Y + 2, e.r + 5, (e.r + 5) * .45, 0, 0, TAU); bx.stroke(); bx.globalAlpha = 1; glows.push([X, Y - 6 * sc, 16 * sc, hexToRgb(c), .35]); }
  const alpha = e.def.tpl === 'ghost' ? .78 : e.clone ? .7 : 1;
  const squash = e.flash > 0 ? 1.08 : 1;
  const winding = e.wind > 0 || (e.charging && e.charging.phase === 0);
  drawSpr(bx, spr, X + lx2, Y + 3 + bob - airOff, sc * squash, e.face < 0, false, alpha);
  if (e.flash > 0 || (winding && Math.floor(G.time * 20) % 2)) { bx.save(); bx.globalAlpha = e.flash > 0 ? .9 : .5; if (winding && !(e.flash > 0)) bx.filter = 'none'; drawSpr(bx, spr, X + lx2, Y + 3 + bob - airOff, sc * squash, e.face < 0, true, winding && !(e.flash > 0) ? .45 : .9); bx.restore(); }
  if (e.status.freeze || e.status.chill) { bx.save(); drawSpr(bx, spr, X, Y + 3 + bob - airOff, sc, e.face < 0, true, e.status.freeze ? .55 : .2); bx.restore(); }
  if (e.status.stun || e.status.root) { for (let i = 0; i < 3; i++) { const a = G.time * 6 + i * 2.1; bx.fillStyle = '#ffe060'; bx.fillRect(Math.round(X + Math.cos(a) * 5), Math.round(Y - spr.h * sc - 2 + Math.sin(a) * 2), 1, 1); } }
  if (e.shielded) { bx.strokeStyle = 'rgba(160,220,255,.6)'; bx.beginPath(); bx.arc(X, Y - spr.h * sc / 2, spr.w * sc / 2 + 3, 0, TAU); bx.stroke(); }
  if (!e.boss && e.hp < e.maxHp) {
    const w = Math.max(10, Math.round(e.r * 2.4)), yy = Math.round(Y - spr.h * sc - 1 + bob);
    bx.fillStyle = '#000'; bx.fillRect(X - w / 2 - 1, yy - 1, w + 2, 3); bx.fillStyle = e.elite ? '#ff9a30' : '#d8403a'; bx.fillRect(X - w / 2, yy, Math.max(0, w * e.hp / e.maxHp), 1);
  }
  if (e.boss) { lights.push([X, Y - 20, 60]); if (e.def.tpl === 'dragon' || e.bossId === 'archdemon') glows.push([X, Y - 20, 40, '255,100,40', .3]); }
  if (e.def.elem === 'fire' || e.def.proj === 'fire') glows.push([X, Y - 6, 12, '255,120,40', .3]);
  if (e.thief) lights.push([X, Y - 6, 30]);
}
function drawAlly(a) {
  const X = Math.round(a.x), Y = Math.round(a.y);
  bx.strokeStyle = 'rgba(160,255,120,.5)'; bx.beginPath(); bx.ellipse(X, Y + 3, a.r + 2, (a.r + 2) * .4, 0, 0, TAU); bx.stroke();
  const spr = entSprite(a); const bob = a.moving ? Math.round(Math.abs(Math.sin(a.t * 10))) : 0;
  drawSpr(bx, spr, X, Y + 3 + bob + (a.def.fly ? -3 : 0), a.scale, a.face < 0, a.flash > 0, a.life < 3 ? .5 + .5 * Math.sin(G.time * 20) : .95);
}
function drawPlayer(p) {
  const X = Math.round(p.x), Y = Math.round(p.y), z = Math.round(p.z || 0);
  const C = CLASSES[p.cls], spr = makeSprite('human', C.pal);
  shadow(X, Y + 3, 5);
  if (p.shield > 0) { bx.strokeStyle = `rgba(255,240,160,${.4 + .2 * Math.sin(G.time * 8)})`; bx.beginPath(); bx.arc(X, Y - 5 - z, 11, 0, TAU); bx.stroke(); }
  const moving = Math.hypot(p.vx, p.vy) > 5;
  const bob = moving ? Math.round(Math.abs(Math.sin(p.walk))) : 0;
  let alpha = p.stealth > 0 ? .35 : 1;
  if (p.ifr > 0 && !p.dashV && !p.leap && Math.floor(G.time * 24) % 2) alpha *= .45;
  if (G.state === 'dying') alpha = Math.max(0, G.dyingT / 1.8);
  // weapon behind or in front depending on aim
  const w = p.equip.weapon;
  const drawWeapon = () => {
    if (!w) return;
    const T = WEAPON_TYPES[w.type], icon = itemIcon(w.type, RARITIES[w.rar].color).cv;
    let a = p.aim;
    if (T.kind === 'melee' && p.swing > 0) { const k = 1 - p.swing / .2; a = p.aim + p.swingDir * p.swingArc / 2 * (1 - 2 * k); }
    else if (T.kind === 'melee') a = p.aim - .5 * p.face;
    bx.save(); bx.globalAlpha = alpha;
    bx.translate(X + p.face * 2, Y - 5 - z + bob);
    if (w.type === 'bow') { bx.rotate(a); bx.drawImage(icon, -4, -8, 13, 13); }
    else { bx.rotate(a + Math.PI / 4); const s = w.type === 'greatsword' || w.type === 'spear' ? 16 : 13; bx.drawImage(icon, -3, -s + 3, s, s); }
    bx.restore();
  };
  const behind = Math.sin(p.aim) < -0.2;
  if (behind) drawWeapon();
  drawSpr(bx, spr, X, Y + 3 + bob - z, 1, p.face < 0, p.flash > 0, alpha);
  if (!behind) drawWeapon();
}
function drawFx(f, lights, glows) {
  const k = f.t / f.dur;
  switch (f.type) {
    case 'ring': bx.strokeStyle = f.color; bx.globalAlpha = 1 - k; bx.lineWidth = 2; bx.beginPath(); bx.arc(f.x, f.y, f.r * (.3 + .7 * k), 0, TAU); bx.stroke(); bx.lineWidth = 1; bx.globalAlpha = 1; break;
    case 'slash': {
      bx.save(); bx.translate(f.x, f.y); bx.globalAlpha = 1 - k;
      const a0 = f.ang - f.arc / 2, a1 = f.ang + f.arc / 2;
      const sweep = f.dir > 0 ? [a0, lerp(a0, a1, Math.min(1, k * 2.2))] : [lerp(a1, a0, Math.min(1, k * 2.2)), a1];
      bx.strokeStyle = '#ffffff'; bx.lineWidth = 3; bx.beginPath(); bx.arc(0, 0, f.r - 2, sweep[0], sweep[1]); bx.stroke();
      bx.strokeStyle = f.color || '#cfd3db'; bx.lineWidth = 1; bx.beginPath(); bx.arc(0, 0, f.r, sweep[0], sweep[1]); bx.stroke();
      bx.restore(); bx.lineWidth = 1; bx.globalAlpha = 1; break;
    }
    case 'beam': bx.strokeStyle = f.color; bx.globalAlpha = 1 - k; bx.lineWidth = 2; bx.beginPath(); bx.moveTo(f.x0, f.y0); bx.lineTo(f.x1, f.y1); bx.stroke(); bx.lineWidth = 1; bx.globalAlpha = 1; glows.push([f.x1, f.y1, 12, hexToRgb(f.color), .5]); break;
    case 'bolt': bx.globalAlpha = 1 - k; for (const [col, lw] of [[f.color, 3], ['#ffffff', 1]]) { bx.strokeStyle = col; bx.lineWidth = lw; bx.beginPath(); f.pts.forEach((pt, i) => i ? bx.lineTo(pt[0], pt[1]) : bx.moveTo(pt[0], pt[1])); bx.stroke(); } bx.lineWidth = 1; bx.globalAlpha = 1; lights.push([f.pts[f.pts.length - 1][0], f.pts[f.pts.length - 1][1], 60]); break;
    case 'spin': bx.strokeStyle = '#e8e0d0'; bx.globalAlpha = 1 - k; bx.lineWidth = 2; bx.beginPath(); bx.arc(f.x, f.y, f.r * (.6 + .4 * k), k * 6, k * 6 + 4.2); bx.stroke(); bx.lineWidth = 1; bx.globalAlpha = 1; break;
    case 'ghost': { const spr = makeSprite('human', CLASSES[G.p.cls].pal); drawSpr(bx, spr, f.x, f.y + 3, 1, f.face < 0, true, .35 * (1 - k)); break; }
    case 'portal': { const r = (f.big ? 16 : 8) * Math.sin(Math.min(1, k * 1.3) * Math.PI); bx.strokeStyle = f.ally ? '#9fff7a' : '#c060ff'; bx.globalAlpha = .9; bx.beginPath(); bx.ellipse(f.x, f.y + 2, r, r * .4, 0, 0, TAU); bx.stroke(); bx.fillStyle = f.ally ? 'rgba(120,255,120,.25)' : 'rgba(170,80,255,.3)'; bx.fill(); bx.globalAlpha = 1; if (Math.random() < .5) G.parts.push(part(f.x + rand(-r, r), f.y, 0, -rand(20, 40), .4, f.ally ? '#9fff7a' : '#c080ff', 1, true)); glows.push([f.x, f.y, 16, f.ally ? '120,255,120' : '170,80,255', .5]); break; }
    case 'death': drawSpr(bx, f.spr, f.x, f.y + 3 + k * 4, f.scale * (1 + k * .2), f.face < 0, true, (1 - k) * .8); break;
    case 'arrowfall': { const y = f.y - 30 * (1 - k); bx.strokeStyle = '#e8dcc0'; bx.beginPath(); bx.moveTo(f.x, y - 5); bx.lineTo(f.x, y); bx.stroke(); if (k > .9) G.parts.push(part(f.x, f.y, rand(-15, 15), -rand(10, 30), .25, '#c8b890', 1)); break; }
    case 'lob': { const x = lerp(f.x0, f.x1, k), y = lerp(f.y0, f.y1, k) - Math.sin(k * Math.PI) * 50; bx.fillStyle = '#2a2a2a'; bx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4); bx.fillStyle = '#ff8a30'; bx.fillRect(Math.round(x), Math.round(y) - 3, 1, 1); break; }
  }
}

/* ---------------- HUB SCENE (campfire at the dungeon mouth) ---------------- */
function renderHubScene(dt) {
  G.hubT += dt;
  const t = G.hubT;
  bx.setTransform(1, 0, 0, 1, 0, 0); bx.globalCompositeOperation = 'source-over'; bx.globalAlpha = 1;
  const g = bx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#0a0814'); g.addColorStop(.6, '#1a1224'); g.addColorStop(1, '#0c0a10');
  bx.fillStyle = g; bx.fillRect(0, 0, VW, VH);
  const r = RNG(99);
  for (let i = 0; i < 90; i++) { const x = r() * VW, y = r() * VH * .55; bx.fillStyle = `rgba(255,255,255,${.3 + .5 * Math.abs(Math.sin(t * .8 + i))})`; bx.fillRect(Math.round(x), Math.round(y), 1, 1); }
  // mountains
  bx.fillStyle = '#16101e';
  bx.beginPath(); bx.moveTo(0, VH * .62); for (let x = 0; x <= VW; x += 8) bx.lineTo(x, VH * .62 - Math.abs(Math.sin(x * .013) * 40) - Math.abs(Math.sin(x * .031 + 1) * 18)); bx.lineTo(VW, VH); bx.lineTo(0, VH); bx.fill();
  // ground
  const gy = Math.round(VH * .7);
  bx.fillStyle = '#1d1622'; bx.fillRect(0, gy, VW, VH - gy);
  for (let i = 0; i < 160; i++) { bx.fillStyle = r() < .5 ? '#261d2c' : '#150f18'; bx.fillRect(Math.round(r() * VW), gy + Math.round(r() * (VH - gy)), 2, 1); }
  // dungeon gate
  const narrow = innerWidth < 900;
  const fx = Math.round(narrow ? VW * .5 : VW * .27), fy = gy + 14;
  const gx = fx - 70;
  bx.fillStyle = '#3a3044'; bx.fillRect(gx - 26, gy - 58, 52, 60); bx.fillStyle = '#050307'; bx.fillRect(gx - 16, gy - 44, 32, 46); bx.beginPath(); bx.arc(gx, gy - 44, 16, Math.PI, 0); bx.fill();
  bx.fillStyle = '#4a3e56'; for (let i = 0; i < 6; i++) bx.fillRect(gx - 26 + i * 9, gy - 60, 6, 3);
  // campfire
  bx.fillStyle = '#4a3020'; bx.fillRect(fx - 8, fy - 1, 16, 3); bx.fillStyle = '#2a1a10'; bx.fillRect(fx - 6, fy + 1, 12, 2);
  for (let i = 0; i < 6; i++) { const h = 6 + Math.abs(Math.sin(t * 7 + i * 1.7)) * 8; bx.fillStyle = i % 2 ? '#ff8a20' : '#ffc040'; bx.fillRect(fx - 5 + i * 2, fy - h, 2, h); }
  bx.fillStyle = '#fff0a0'; bx.fillRect(fx - 1, fy - 6 - Math.abs(Math.sin(t * 9)) * 3, 2, 4);
  if (Math.random() < .4) G.hubParts.push(part(fx + rand(-4, 4), fy - 8, rand(-6, 6), -rand(20, 40), rand(1, 2), chance(.5) ? '#ff9a30' : '#ffd060', 1, true));
  for (const pt of G.hubParts) { pt.life -= dt; pt.x += pt.vx * dt + Math.sin(t * 3 + pt.y) * .1; pt.y += pt.vy * dt; }
  G.hubParts = G.hubParts.filter(pt => pt.life > 0);
  for (const pt of G.hubParts) { bx.globalAlpha = pt.life / pt.max; bx.fillStyle = pt.color; bx.fillRect(Math.round(pt.x), Math.round(pt.y), 1, 1); }
  bx.globalAlpha = 1;
  // hero by the fire
  const cls = Save.data.last.cls, spr = makeSprite('human', CLASSES[cls].pal);
  drawSpr(bx, spr, fx + 22, fy + 2 + Math.round(Math.sin(t * 2) * .6), 2, true);
  const wi = itemIcon(CLASSES[cls].weapon, '#b9b1a2').cv; bx.save(); bx.translate(fx + 34, fy - 2); bx.rotate(-.4); bx.drawImage(wi, -4, -16, 16, 16); bx.restore();
  // light
  lx.globalCompositeOperation = 'source-over'; lx.clearRect(0, 0, VW, VH); lx.fillStyle = 'rgba(4,2,9,.72)'; lx.fillRect(0, 0, VW, VH);
  lx.globalCompositeOperation = 'destination-out'; const rr = 120 + Math.sin(t * 8) * 4; lx.drawImage(lightSprite(), fx - rr, fy - 6 - rr, rr * 2, rr * 2);
  lx.drawImage(lightSprite(), 0, -VH * .6, VW, VH * 1.2);
  bx.drawImage(lightC, 0, 0);
  bx.globalCompositeOperation = 'lighter'; bx.globalAlpha = .35; bx.drawImage(lightSprite('255,140,50'), fx - 70, fy - 76, 140, 140); bx.globalAlpha = 1; bx.globalCompositeOperation = 'source-over';
}

/* ---------------- LOOP ---------------- */
function handleKeys() {
  if (G.state !== 'play') return;
  const m = G.modal;
  const panel = v => { if (m === v) UI.close(); else if (!m || GAME_TABS.some(t => t[0] === m) || m === 'menu' || m === 'pause') UI.open(v); };
  if (Input.tap('Escape')) { if (m) { if (!['levelup', 'end'].includes(m)) UI.close(); } else UI.open('menu'); }
  if (Input.tap('KeyI') || Input.tap('Tab')) panel('inventory');
  if (Input.tap('KeyC')) panel('character');
  if (Input.tap('KeyK')) panel('abilities');
  if (Input.tap('KeyM')) panel('map');
  if (Input.tap('KeyP')) { if (m === 'pause') UI.close(); else if (!m) UI.open('pause'); }
  if (!G.modal && G.pendingLevel > 0) { Sfx.play('levelup'); UI.open('levelup'); }
}
let lastT = 0;
function frame(ts) {
  const now = ts / 1000; let dt = Math.min(.05, now - (lastT || now)); lastT = now;
  try {
    if (G.state === 'play' || G.state === 'dying' || G.state === 'ended') {
      if (G.state === 'dying') { G.dyingT -= dt; if (G.dyingT <= 0) endRun('death'); }
      if ((G.state === 'play' || G.state === 'dying') && !G.modal) {
        if (G.hitstop > 0) G.hitstop -= dt;
        else { let sdt = dt; if (G.slow > 0) { G.slow -= dt; sdt *= .35; } if (G.state === 'dying') sdt *= .3; update(sdt); }
      }
      handleKeys();
      if (G.D) { renderWorld(); if (G.p && G.state !== 'ended') updateHUD(dt); }
      G.flashA = Math.max(0, G.flashA - dt * 2.5);
    } else { renderHubScene(dt); }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buf, 0, 0, VW * SC * DPR, VH * SC * DPR);
  } catch (err) { console.error(err); }
  Input.end();
  requestAnimationFrame(frame);
}
function boot() {
  Save.load();
  cv = document.getElementById('game'); ctx = cv.getContext('2d');
  buf = document.createElement('canvas'); bx = buf.getContext('2d');
  lightC = document.createElement('canvas'); lx = lightC.getContext('2d');
  resize(); addEventListener('resize', resize);
  Input.init(cv);
  // Save progress when the tab is hidden or closed
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (G.state === 'play' && G.p && !G.p.dead) saveRun(); else Save.write(); } });
  toHub();
  requestAnimationFrame(frame);
}
