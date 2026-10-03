/* =====================================================================
   UI — HUD, modal panels (inventory, character, abilities, map, shop,
   events, level-up, menu, settings, end screen) and the hub camp
   ===================================================================== */
const $ = s => document.querySelector(s);
const spriteURLCache = {};
function spriteURL(tpl, pal) { const k = tpl + JSON.stringify(pal); if (!spriteURLCache[k]) spriteURLCache[k] = makeSprite(tpl, pal).img.toDataURL(); return spriteURLCache[k]; }
function iconFor(it) { return itemIcon(it.type, RARITIES[it.rar].color).url; }

function toast(msg, cls = '') {
  const box = $('#toasts'); if (!box) return;
  while (box.children.length > 3) box.firstChild.remove();
  const d = document.createElement('div'); d.className = 'toast px ' + cls; d.textContent = msg;
  if (cls && cls[0] === 'r') d.style.color = RARITIES[+cls.slice(1)].color;
  box.appendChild(d); setTimeout(() => d.remove(), 3000);
}
function banner(a, b, boss = false) {
  const el = $('#banner'); $('#ban-a').textContent = boss ? b : a; $('#ban-b').textContent = boss ? a : b;
  if (!boss) { $('#ban-a').textContent = a; $('#ban-b').textContent = b; }
  el.className = ''; void el.offsetWidth; el.className = 'show' + (boss ? ' boss' : '');
}
function flashScreen(a) { G.flashA = Math.max(G.flashA, a); }
function unlockAch(id) {
  const A = Save.data.achievements; if (A[id]) return;
  const a = ACHIEVEMENTS.find(x => x.id === id); if (!a) return;
  A[id] = Date.now();
  const r = a.reward;
  if (r.shards) { Save.data.shards += r.shards; Save.data.totalShards += r.shards; }
  for (const k of ['luck', 'dmg', 'hp', 'speed']) if (r[k]) Save.data.bonus[k] = (Save.data.bonus[k] || 0) + r[k];
  toast(`Achievement: ${a.name} (${rewardText(r)})`, 'ach'); Sfx.play('secret');
  Save.write();
  if (G.p && G.state === 'play') recalc(G.p);
}
function rewardText(r) {
  const o = [];
  if (r.shards) o.push(`+${r.shards} Soul Shards`); if (r.luck) o.push(`+${r.luck} Luck`); if (r.dmg) o.push(`+${Math.round(r.dmg * 100)}% damage`);
  if (r.hp) o.push(`+${Math.round(r.hp * 100)}% max HP`); if (r.speed) o.push(`+${Math.round(r.speed * 100)}% move speed`);
  return o.join(', ');
}

/* ---------------- HUD ---------------- */
const HUD = { cache: {}, t: 0 };
function setText(id, v) { if (HUD.cache[id] !== v) { HUD.cache[id] = v; const el = document.getElementById(id); if (el) el.textContent = v; } }
function setW(id, f) { const v = (clamp(f, 0, 1) * 100).toFixed(1) + '%'; if (HUD.cache[id] !== v) { HUD.cache[id] = v; document.getElementById(id).style.width = v; } }
function buildAbilityBar() {
  const p = G.p, C = CLASSES[p.cls];
  let h = '';
  p.slots.forEach((id, i) => {
    const A = id && ABILITIES[id];
    h += `<div class="slot" id="as${i}" title="${A ? esc(A.name) : 'Empty slot'}">${A ? `<img alt="" src="${abilityIcon(A.glyph, A.color).url}">` : ''}<div class="cd" id="ac${i}"></div><span class="k">${i + 1}</span>${A ? `<span class="n">${p.abil[id]}</span>` : ''}</div>`;
  });
  h += `<div class="slot sep" title="Dash (Space / right mouse)"><img alt="" src="${abilityIcon('dash', '#4a4a5a').url}"><div class="cd" id="acd"></div><span class="k">SPC</span><span class="n" id="adn"></span></div>`;
  h += `<div class="slot" title="Health potion (Q)"><img alt="" src="${abilityIcon('potion', '#8a2a2a').url}"><span class="k">Q</span><span class="n" id="apn"></span></div>`;
  $('#abar').innerHTML = h;
  const pc = $('#portrait'), x = pc.getContext('2d'); x.clearRect(0, 0, 14, 14); x.drawImage(makeSprite('human', C.pal).img, 0, 0);
}
function updateHUD(dt) {
  const p = G.p, R = G.run; if (!p) return;
  if (G.hudDirty) { G.hudDirty = false; buildAbilityBar(); HUD.cache = {}; }
  setText('h-name', CLASSES[p.cls].name); setText('h-sub', `Level ${p.level}` + (p.ap ? ` · ${p.ap} ability point${p.ap > 1 ? 's' : ''}` : ''));
  p.hpShown = lerp(p.hpShown, p.hp / p.S.maxHp, Math.min(1, dt * 3));
  setW('b-hp', p.hp / p.S.maxHp); setW('bu-hp', Math.max(p.hp / p.S.maxHp, p.hpShown));
  setText('t-hp', `${Math.ceil(p.hp)} / ${p.S.maxHp}`);
  setW('b-mp', p.mp / p.S.maxMp); setText('t-mp', `${Math.floor(p.mp)} / ${p.S.maxMp}`);
  setW('b-xp', p.xp / xpFor(p.level));
  $('#shbar').hidden = !(p.shield > 0); if (p.shield > 0) setW('b-sh', p.shield / p.S.maxHp);
  setText('h-gold', fmt(p.gold)); setText('h-luck', String(Math.round(p.S.luck))); setText('h-ap', String(p.ap));
  setText('h-area', BIOMES[R.bi].name);
  setText('h-floor', `Floor ${R.floorNum}${R.floor === 3 ? ' · Boss lair' : ''} · ${DIFFS[R.diff].name}${R.endless ? ' · Endless' : ''}`);
  p.slots.forEach((id, i) => {
    const el = document.getElementById('ac' + i); if (!el) return;
    const f = id && p.cds[id] > 0 ? p.cds[id] / (p.cdMax[id] || 1) : 0;
    el.style.setProperty('--p', f.toFixed(3));
    const slot = document.getElementById('as' + i);
    if (slot && id) slot.classList.toggle('off', p.mp < ABILITIES[id].cost);
  });
  const dc = document.getElementById('acd'); if (dc) dc.style.setProperty('--p', p.dash.ch > 0 ? 0 : (1 - p.dash.t / 1.3).toFixed(3));
  setText('adn', String(p.dash.ch)); setText('apn', String(p.potions));
  // boss bar
  const b = G.boss; $('#bossbar').hidden = !b;
  if (b) { setText('boss-name', b.name + (b.phase ? `  ·  Phase ${b.phase + 1}` : '')); setW('b-boss', b.hp / b.maxHp); }
  HUD.t -= dt;
  if (HUD.t <= 0) {
    HUD.t = .2;
    let h = '';
    for (const bf of p.buffs) h += `<div style="--c:${bf.color || '#e8b04a'}">${esc(bf.name)} ${Math.ceil(bf.t)}s</div>`;
    const st = p.status;
    if (st.burn) h += `<div style="--c:#ff8a30">Burning</div>`; if (st.poison) h += `<div style="--c:#8ae04a">Poisoned</div>`;
    if (st.chill) h += `<div style="--c:#8ad8ff">Chilled</div>`; if (p.stealth > 0) h += `<div style="--c:#8a8aa0">Stealthed ${Math.ceil(p.stealth)}s</div>`;
    if (R.curse) h += `<div style="--c:#b060ff">Cursed floor: +40% enemy damage</div>`;
    if (HUD.cache.buffs !== h) { HUD.cache.buffs = h; $('#buffs').innerHTML = h; }
    let c = '';
    if (p.combo >= 5) c += `${p.combo} hit combo<small>+${Math.min(25, Math.round(p.combo * .5))}% damage</small>`;
    if (G.streakMsg && G.streakMsg.t > 0) c += `<div style="color:#ff8a70;margin-top:6px">${esc(G.streakMsg.text)}</div>`;
    if (HUD.cache.combo !== c) { HUD.cache.combo = c; $('#combo').innerHTML = c; }
  }
  // interact prompt
  const it = G.interact;
  const pr = $('#prompt');
  if (it && !G.modal) { pr.hidden = false; const h = `<kbd>E</kbd>${esc(it.label)}`; if (HUD.cache.prompt !== h) { HUD.cache.prompt = h; pr.innerHTML = h; } if (it.color) pr.style.color = it.color; else pr.style.color = ''; }
  else pr.hidden = true;
  $('#flash').style.opacity = G.flashA.toFixed(2);
  $('#vignette').style.boxShadow = G.hurtFlash > 0 ? `inset 0 0 ${80 * G.hurtFlash / .35}px ${30 * G.hurtFlash / .35}px rgba(200,20,20,.55)` : (p.hp / p.S.maxHp < .25 ? 'inset 0 0 60px 10px rgba(160,10,10,.4)' : 'none');
}

/* ---------------- MINIMAP & MAP ---------------- */
function drawMap(cv, px, full) {
  const D = G.D; if (!D) return;
  const x = cv.getContext('2d');
  if (cv.width !== D.w * px) { cv.width = D.w * px; cv.height = D.h * px; }
  x.fillStyle = '#07050a'; x.fillRect(0, 0, cv.width, cv.height);
  const B = BIOMES[G.run.bi], liq = LIQUID_COLS[B.liquid || 'water'][1];
  for (let j = 0; j < D.h; j++) for (let i = 0; i < D.w; i++) {
    const k = j * D.w + i; if (!D.explored[k]) continue;
    const t = D.t[k];
    x.fillStyle = t === T_FLOOR ? '#4c4256' : t === T_LIQ ? liq : t === T_DOOR ? '#a07a30' : t === T_CRACK ? '#2a2233' : '#211b29';
    x.fillRect(i * px, j * px, px, px);
  }
  const sense = Save.data.upgrades.sense;
  const dot = (tx, ty, c, s = 1) => { x.fillStyle = c; x.fillRect(Math.floor(tx * px - s * px / 2), Math.floor(ty * px - s * px / 2), Math.max(2, s * px), Math.max(2, s * px)); };
  for (const q of D.rooms) {
    if (!q.visited && !(sense && (q.type === 'shop' || q.type === 'treasure'))) { if (q.type === 'boss' && D.explored[Math.floor(q.cy) * D.w + Math.floor(q.cx)]) dot(q.cx, q.cy, '#c9433b', 2); continue; }
    const col = { shop: '#e8b04a', treasure: '#f0d060', heal: '#7bd88a', boss: '#c9433b', event: '#b080ff', elite: '#ff8a40', secret: '#d0a0ff' }[q.type];
    if (col) dot(q.cx, q.cy, col, full ? 1.5 : 1.5);
    if (!q.cleared && q.visited && (q.type === 'monster' || q.type === 'elite')) { x.strokeStyle = '#c9433b'; x.lineWidth = 1; x.strokeRect(q.x * px + .5, q.y * px + .5, q.w * px - 1, q.h * px - 1); }
  }
  for (const pp of G.props) {
    const tx = pp.x / TS, ty = pp.y / TS, k = Math.floor(ty) * D.w + Math.floor(tx);
    if (pp.type === 'stairs' && D.explored[k]) dot(tx, ty, '#ffffff', 2);
    if (pp.type === 'portal' && D.explored[k]) dot(tx, ty, '#9ad0ff', 2);
    if (pp.type === 'chest' && !pp.used && (D.explored[k] || sense)) dot(tx, ty, '#f0d060', 1);
  }
  if (sense) for (const q of D.rooms) if (q.crack && !D.explored[q.crack.y * D.w + q.crack.x]) dot(q.crack.x + .5, q.crack.y + .5, '#d0a0ff', 1);
  if (full || true) for (const e of G.ents) if (!e.dead && e.spawnT <= 0 && !e.dormant && D.explored[Math.floor(e.y / TS) * D.w + Math.floor(e.x / TS)] && G.curRoom && e.roomId === G.curRoom.id) dot(e.x / TS, e.y / TS, e.boss ? '#ff3030' : '#ff6a5a', e.boss ? 2 : 1);
  const p = G.p;
  if (Math.floor(G.time * 3) % 2 === 0 || full) dot(p.x / TS, p.y / TS, '#ffffff', full ? 1.6 : 1.6);
}

/* ---------------- MODALS ---------------- */
const UI = {
  sel: null, confirm: null,
  open(kind, data) { G.modal = kind; G.modalData = data; this.sel = null; this.confirm = null; this.render(); $('#modal').hidden = false; Input.mouse.down = false; },
  close() { G.modal = null; G.modalData = null; $('#modal').hidden = true; Input.mouse.down = false; },
  render() {
    const box = $('#modal-box'); const v = VIEWS[G.modal];
    if (!v) return;
    const sc = box.scrollTop; box.innerHTML = v(G.modalData); box.scrollTop = sc;
    if (G.modal === 'map') drawMap(document.getElementById('mapcv'), 7, true);
  }
};
const GAME_TABS = [['inventory', 'Inventory', 'I'], ['character', 'Character', 'C'], ['abilities', 'Abilities', 'K'], ['map', 'Map', 'M']];
function tabsHTML(cur) {
  return `<div class="tabs">${GAME_TABS.map(t => `<button class="btn small ${cur === t[0] ? 'on' : ''}" data-a="open" data-v="${t[0]}">${t[1]} <span class="muted">${t[2]}</span></button>`).join('')}<button class="btn small" data-a="close">Close</button></div>`;
}
function itemDetail(it, cmp) {
  const R = RARITIES[it.rar];
  let h = `<div class="nm" style="color:${R.color}">${esc(it.name)}</div><div class="sub">${R.name} ${it.kind === 'weapon' ? WEAPON_TYPES[it.type].name : ARMOR_SLOTS[it.type].name} · item level ${it.ilvl}</div><ul>`;
  if (it.kind === 'weapon') {
    const T = WEAPON_TYPES[it.type];
    h += `<li>${it.dmg.toFixed(1)} damage · ${it.rate.toFixed(2)} attacks/s</li><li class="muted">${(it.dmg * it.rate).toFixed(1)} base DPS · scales with ${T.stat.toUpperCase()} · ${T.kind}</li>`;
    if (T.note) h += `<li class="muted">${esc(T.note)}</li>`;
  }
  for (const k in it.stats) h += `<li>${statLine(k, it.stats[k])}</li>`;
  h += '</ul>';
  if (it.power) h += `<div class="power">${esc(POWERS[it.power].name)}: ${esc(POWERS[it.power].desc)}</div>`;
  if (cmp !== undefined) {
    if (!cmp) h += `<div class="cmp good">Nothing equipped in this slot.</div>`;
    else if (cmp !== it) {
      const rows = [];
      if (it.kind === 'weapon') { const d = it.dmg * it.rate - cmp.dmg * cmp.rate; rows.push(`<span class="${d >= 0 ? 'good' : 'bad'}">${d >= 0 ? '+' : ''}${d.toFixed(1)} base DPS</span>`); }
      const keys = new Set([...Object.keys(it.stats), ...Object.keys(cmp.stats)]);
      for (const k of keys) { const d = (it.stats[k] || 0) - (cmp.stats[k] || 0); if (Math.abs(d) > .05) rows.push(`<span class="${d > 0 ? 'good' : 'bad'}">${statLine(k, d)}</span>`); }
      if (cmp.power && cmp.power !== it.power) rows.push(`<span class="bad">Lose ${esc(POWERS[cmp.power].name)}</span>`);
      h += `<div class="cmp"><div class="muted">Compared with ${esc(cmp.name)}:</div>${rows.join('<br>') || '<span class="muted">Identical stats</span>'}</div>`;
    }
  }
  return h;
}
const VIEWS = {
  inventory() {
    const p = G.p;
    const sel = UI.sel;
    let h = `<div class="mhead"><h2>Inventory</h2>${tabsHTML('inventory')}</div><div class="split"><div class="sec"><h3>Equipped</h3><div class="equip">`;
    for (const s of EQUIP_SLOTS) {
      const it = p.equip[s];
      h += it ? `<button class="slotbox ${sel === 'eq:' + s ? 'sel' : ''}" style="--rc:${RARITIES[it.rar].color}" data-a="sel" data-v="eq:${s}" title="${esc(it.name)}"><span class="lbl">${s}</span><img alt="" src="${iconFor(it)}">${it.rar >= 3 ? '<i class="glow"></i>' : ''}</button>`
        : `<div class="slotbox empty"><span class="lbl">${s}</span></div>`;
    }
    h += `</div><h3>Backpack ${p.inv.length} / 24</h3><div class="grid-inv">`;
    for (let i = 0; i < 24; i++) {
      const it = p.inv[i];
      h += it ? `<button class="slotbox ${sel === 'inv:' + i ? 'sel' : ''}" style="--rc:${RARITIES[it.rar].color}" data-a="sel" data-v="inv:${i}" title="${esc(it.name)}"><img alt="" src="${iconFor(it)}">${it.rar >= 3 ? '<i class="glow"></i>' : ''}</button>` : `<div class="slotbox empty"></div>`;
    }
    h += `</div><div class="muted">Gold <span class="gold">${fmt(p.gold)}</span> · Potions ${p.potions}/${p.maxPotions} · Tip: pick up items with E</div></div><div class="detail">`;
    let it = null, where = null;
    if (sel) { const [a, b] = sel.split(':'); it = a === 'eq' ? p.equip[b] : p.inv[+b]; where = a; }
    if (it) {
      h += itemDetail(it, where === 'inv' ? p.equip[it.slot] : undefined);
      h += `<div class="row" style="margin-top:6px">`;
      if (where === 'inv') h += `<button class="btn primary small" data-a="equip" data-v="${sel.split(':')[1]}">Equip</button><button class="btn small" data-a="sell" data-v="${sel.split(':')[1]}">Sell ${fmt(Math.round(it.value * .5))}g</button>`;
      else h += `<button class="btn small" data-a="unequip" data-v="${it.slot}">Unequip</button>`;
      h += `</div>`;
      if (UI.confirm === 'sell' && where === 'inv') h += '';
    } else h += `<div class="muted">Select an item to see its stats. Backpack items are compared with what you have equipped.</div><div class="note">Rarities: <span class="r0">Common</span> · <span class="r1">Uncommon</span> · <span class="r2">Rare</span> · <span class="r3">Epic</span> · <span class="r4">Legendary</span> · <span class="r5">Mythic</span></div>`;
    h += `</div></div>`;
    return h;
  },
  character() {
    const p = G.p, S = p.S, C = CLASSES[p.cls], R = G.run;
    const legChance = (() => { const lf = luckFactor(effLuck()); const ws = RARITIES.map((r, i) => r.w * (1 + lf * i * 1.4)); const t = ws.reduce((a, b) => a + b, 0); return (ws[4] + ws[5]) / t * 100; })();
    const baseLeg = (() => { const ws = RARITIES.map(r => r.w); const t = ws.reduce((a, b) => a + b, 0); return (ws[4] + ws[5]) / t * 100; })();
    const row = (k, v) => `<div><span>${k}</span><b>${v}</b></div>`;
    let h = `<div class="mhead"><h2>${esc(C.name)} · Level ${p.level}</h2>${tabsHTML('character')}</div>`;
    h += `<div class="sec"><h3>Attributes</h3><div class="statgrid">${row('Strength', S.str)}${row('Dexterity', S.dex)}${row('Intelligence', S.int)}${row('Vitality', S.vit)}${row('Luck', `<span class="good">${Math.round(S.luck)}</span>`)}${row('XP', `${Math.floor(p.xp)} / ${xpFor(p.level)}`)}</div></div>`;
    h += `<div class="sec"><h3>Combat</h3><div class="statgrid">${row('Max HP', S.maxHp)}${row('Max ' + C.res, S.maxMp)}${row('Armor', `${S.armor} (${Math.round((1 - 100 / (100 + S.armor * 1.5)) * 100)}% less damage)`)}${row('Weapon power', weaponPower(p).toFixed(1))}${row('Ability power', abilityPower(p).toFixed(1))}${row('Critical chance', (S.crit * 100).toFixed(1) + '%')}${row('Critical damage', Math.round(S.critDmg * 100) + '%')}${row('Attack speed', '+' + Math.round(S.atkSpd * 100) + '%')}${row('Move speed', Math.round(S.move))}${row('Lifesteal', (S.lifesteal * 100).toFixed(1) + '%')}${row('Armor penetration', Math.round(S.armorPen * 100) + '%')}${row('Cooldown reduction', Math.round(S.cdr * 100) + '%')}${row('Block chance', Math.round(S.block * 100) + '%')}${row('HP regen', S.regen.toFixed(1) + '/s')}${row(C.res + ' regen', S.mpRegen.toFixed(1) + '/s')}${row('Burn / Chill / Poison', `${Math.round(S.fire * 100)}% / ${Math.round(S.ice * 100)}% / ${Math.round(S.poison * 100)}%`)}${row('Chain lightning', Math.round(S.shock * 100) + '%')}${row('Dash charges', S.dashMax)}</div></div>`;
    h += `<div class="sec"><h3>Luck ${Math.round(S.luck)}</h3><div class="statgrid">${row('Legendary+ per item', `${legChance.toFixed(2)}% <span class="muted">(base ${baseLeg.toFixed(2)}%)</span>`)}${row('Drop chance', '+' + Math.round(S.lf * 100) + '%')}${row('Gold found', '+' + Math.round(S.lf * 80 + (S.goldMult - 1) * 100) + '%')}${row('Secret room chance', Math.round(Math.min(.85, .35 + S.lf * .6) * 100) + '%')}${row('Extra chest items', Math.round(S.lf * 100) + '%')}${row('Rare power-ups', Math.round((.12 + S.lf * .35) * 100) + '%')}</div><div class="note">Luck has diminishing returns: each point helps less than the last, so Legendaries stay special.</div></div>`;
    h += `<div class="sec"><h3>Passive: ${esc(C.passive.name)}</h3><div>${esc(C.passive.desc)}</div></div>`;
    const boons = {}; for (const b of p.boons) boons[b] = (boons[b] || 0) + 1;
    h += `<div class="sec"><h3>Power-ups this run</h3><div>${Object.keys(boons).length ? Object.keys(boons).map(id => { const b = BOONS.find(x => x.id === id); return `<span class="${b.rare ? 'r3' : 'gold'}">${esc(b.name)}${boons[id] > 1 ? ' x' + boons[id] : ''}</span> <span class="muted">${esc(b.desc)}</span>`; }).join('<br>') : '<span class="muted">None yet. Elites, shrines and chests can drop power-up orbs.</span>'}</div></div>`;
    h += `<div class="sec"><h3>This run</h3><div class="statgrid">${row('Enemies killed', R.stats.kills)}${row('Damage dealt', fmt(R.stats.dmg))}${row('Gold collected', fmt(R.stats.gold))}${row('Bosses defeated', R.stats.bosses)}${row('Best combo', p.bestCombo)}${row('Run time', fmtTime(R.stats.time))}</div></div>`;
    return h;
  },
  abilities() {
    const p = G.p, C = CLASSES[p.cls];
    let h = `<div class="mhead"><h2>Abilities · <span class="${p.ap ? 'good' : 'muted'}">${p.ap} point${p.ap === 1 ? '' : 's'}</span></h2>${tabsHTML('abilities')}</div><div class="note">You earn one ability point per level. Learn new abilities or upgrade them (5 ranks: +25% damage, +10% area and -6% cooldown per rank). Assign up to four to keys 1-4.</div><div class="list">`;
    for (const id of C.abilities) {
      const A = ABILITIES[id], rk = p.abil[id] || 0, slot = p.slots.indexOf(id);
      h += `<div class="abil"><img alt="" src="${abilityIcon(A.glyph, A.color).url}"><div style="min-width:0"><div class="nm" style="font:13px var(--f-display);color:var(--bone)">${esc(A.name)}<span class="pips">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= rk ? 'on' : ''}"></i>`).join('')}</span></div><div style="font-size:19px">${esc(A.desc(Math.max(1, rk)))}</div>${rk > 0 && rk < 5 ? `<div class="muted" style="font-size:17px">Next rank: ${esc(A.desc(rk + 1))}</div>` : ''}<div class="muted" style="font-size:17px">Cooldown ${(A.cd * (1 - .06 * (Math.max(1, rk) - 1))).toFixed(1)}s · Cost ${A.cost} ${C.res.toLowerCase()}</div></div><div class="row" style="justify-content:flex-end">`;
      h += rk < 5 ? `<button class="btn small ${p.ap ? 'primary' : ''}" data-a="learn" data-v="${id}" ${p.ap ? '' : 'disabled'}>${rk ? 'Upgrade' : 'Learn'}</button>` : `<span class="gold" style="font:11px var(--f-display)">MAX</span>`;
      if (rk) h += `<div class="row">${[0, 1, 2, 3].map(i => `<button class="btn small ${slot === i ? 'on primary' : ''}" data-a="slot" data-v="${id}:${i}" title="Assign to key ${i + 1}">${i + 1}</button>`).join('')}</div>`;
      h += `</div></div>`;
    }
    h += `</div><div class="note">Dash: Space or right mouse (${p.S.dashMax} charge${p.S.dashMax > 1 ? 's' : ''}, brief invulnerability). Potion: Q.</div>`;
    return h;
  },
  map() {
    const R = G.run;
    return `<div class="mhead"><h2>${esc(BIOMES[R.bi].name)} · Floor ${R.floorNum}</h2>${tabsHTML('map')}</div><div style="overflow:auto"><canvas id="mapcv"></canvas></div><div class="legend"><span><i style="background:#fff"></i>You / stairs</span><span><i style="background:#e8b04a"></i>Shop</span><span><i style="background:#f0d060"></i>Treasure</span><span><i style="background:#7bd88a"></i>Fountain</span><span><i style="background:#b080ff"></i>Event</span><span><i style="background:#ff8a40"></i>Elite room</span><span><i style="background:#c9433b"></i>Boss</span><span><i style="background:#9ad0ff"></i>Portal</span></div><div class="note">Hazard here: ${esc(BIOMES[R.bi].hazard)}. Cracked walls hide secret rooms — hit them to break through.</div>`;
  },
  levelup() {
    const p = G.p;
    if (!G.levelChoices) {
      const pool = LEVEL_UPS.filter(u => !u.cls || u.cls === p.cls);
      const w = u => u.cls ? 2.2 : 1;
      const out = []; while (out.length < 3) { const u = weightedPick(pool.filter(x => !out.includes(x)), w); out.push(u); }
      G.levelChoices = out;
    }
    return `<div class="mhead"><h2>Level ${p.level - G.pendingLevel + 1}!</h2><span class="muted">Choose one upgrade · +1 ability point</span></div><div class="cards">${G.levelChoices.map((u, i) => `<button class="card" data-a="levelpick" data-v="${i}" style="--cc:${u.cls ? CLASSES[p.cls].color : '#e8b04a'}"><span class="t">${esc(u.name)}</span><span class="d">${esc(u.desc)}</span>${u.cls ? `<span class="muted" style="font-size:16px">${esc(CLASSES[p.cls].name)} upgrade</span>` : ''}</button>`).join('')}</div>`;
  },
  shop(prop) {
    const p = G.p;
    if (!prop.shop) prop.shop = genShop();
    const S = prop.shop, disc = shopDiscount();
    const rr = Math.round((30 + G.run.depth * 5) * (1 + S.rerolls * .6) * disc);
    let h = `<div class="mhead"><h2>Shop</h2><div class="row"><span class="gold">${fmt(p.gold)} gold</span><button class="btn small" data-a="close">Leave</button></div></div><div class="ev-text muted">"Finest goods this side of the abyss. Luck brings better stock, friend."</div><div class="split"><div class="shopgrid">`;
    S.items.forEach((o, i) => {
      const icon = o.kind === 'item' ? iconFor(o.item) : o.kind === 'potion' ? itemIcon('potion', '#e04a4a').url : o.kind === 'elixir' ? itemIcon('potion', o.el.c).url : itemIcon('orb', o.rare ? '#d080ff' : '#ffe080').url;
      const name = o.kind === 'item' ? o.item.name : o.name;
      const col = o.kind === 'item' ? RARITIES[o.item.rar].color : '#eadfc4';
      h += `<button class="shopitem ${UI.sel === i ? 'sel' : ''} ${o.sold ? 'sold' : ''}" style="--rc:${col}" data-a="shopsel" data-v="${i}"><img alt="" src="${icon}"><div style="min-width:0"><div class="nm" style="color:${col}">${esc(name)}</div><div class="p">${o.sold ? 'Sold' : fmt(o.price) + 'g'}</div></div></button>`;
    });
    h += `</div><div class="detail">`;
    const o = S.items[UI.sel];
    if (o && !o.sold) {
      if (o.kind === 'item') h += itemDetail(o.item, p.equip[o.item.slot]);
      else h += `<div class="nm">${esc(o.name)}</div><div>${esc(o.desc)}</div>`;
      h += `<div class="row" style="margin-top:6px"><button class="btn primary small" data-a="buy" data-v="${UI.sel}" ${p.gold >= o.price ? '' : 'disabled'}>Buy for ${fmt(o.price)}g</button></div>`;
    } else h += `<div class="muted">Select something to inspect it.</div>`;
    h += `<div class="row" style="margin-top:10px"><button class="btn small" data-a="reroll" ${p.gold >= rr ? '' : 'disabled'}>Reroll stock ${fmt(rr)}g</button></div><div class="note">Sell your own items from the Inventory (I).</div></div></div>`;
    return h;
  },
  event(prop) {
    const p = G.p, R = G.run;
    const E = EVENTS[prop.type];
    const body = E.text(prop, p);
    return `<div class="mhead"><h2>${esc(E.title)}</h2><span class="gold">${fmt(p.gold)} gold · ${Math.ceil(p.hp)} HP</span></div><div class="ev-text">${body}</div><div class="row">${E.choices(prop, p).map((c, i) => `<button class="btn ${i === 0 ? 'primary' : ''}" data-a="evchoice" data-v="${c.id}" ${c.disabled ? 'disabled' : ''}>${esc(c.label)}</button>`).join('')}</div>`;
  },
  menu() {
    const c = UI.confirm;
    return `<div class="mhead"><h2>Menu</h2><span class="muted">${esc(BIOMES[G.run.bi].name)} · Floor ${G.run.floorNum}</span></div><div class="row"><button class="btn primary" data-a="close">Resume</button><button class="btn" data-a="open" data-v="inventory">Inventory</button><button class="btn" data-a="open" data-v="character">Character</button><button class="btn" data-a="open" data-v="abilities">Abilities</button><button class="btn" data-a="open" data-v="map">Map</button><button class="btn" data-a="open" data-v="settings">Settings</button></div>
      <div class="sec"><h3>Controls</h3><div class="note">WASD move · Mouse aim · Left mouse attack · 1-4 abilities · Space / right mouse dash · Q potion · E interact · I inventory · C character · K abilities · M map · P pause · Esc menu</div></div>
      <div class="row"><button class="btn" data-a="savequit">Save and return to camp</button>${c === 'abandon' ? `<button class="btn danger" data-a="abandon2">Yes, abandon this run</button><button class="btn" data-a="cancel">Keep playing</button>` : `<button class="btn danger" data-a="abandon">Abandon run</button>`}</div><div class="note">Saving keeps your character, items and floor. The floor layout resets when you continue.</div>`;
  },
  pause() { return `<div class="mhead"><h2>Paused</h2></div><div class="note">Press P or Resume to continue.</div><div class="row"><button class="btn primary" data-a="close">Resume</button><button class="btn" data-a="open" data-v="menu">Menu</button></div>`; },
  settings() { return `<div class="mhead"><h2>Settings</h2><button class="btn small" data-a="${G.state === 'hub' ? 'close' : 'open'}" data-v="menu">Back</button></div>${settingsHTML()}`; },
  end(d) {
    const R = d.run, s = R.stats;
    const title = d.type === 'death' ? 'You Died' : d.type === 'victory' ? 'Victory' : 'Returned to Camp';
    const sub = d.type === 'death' ? `Slain in ${BIOMES[R.bi].name}, floor ${R.floorNum}.` : d.type === 'victory' ? 'The Eternal Sentinel has fallen. The depths are yours.' : 'You made it out alive with your shards.';
    const st = (k, v) => `<div><b>${v}</b><span>${k}</span></div>`;
    return `<div class="mhead"><h2 style="color:${d.type === 'death' ? '#ff7a6a' : '#e8b04a'};font-size:28px">${title}</h2><span class="muted">${esc(CLASSES[R.cls].name)} · Level ${d.level} · ${DIFFS[R.diff].name}${R.endless ? ' · Endless' : ''}</span></div><div class="ev-text">${sub}</div>
      <div class="death-stats">${st('Damage dealt', fmt(s.dmg))}${st('Enemies killed', s.kills)}${st('Gold collected', fmt(s.gold))}${st('Floor reached', R.floorNum)}${st('Bosses defeated', s.bosses)}${st('Run time', fmtTime(s.time))}${st('Elites slain', s.elites)}${st('Chests opened', s.chests)}${st('Damage taken', fmt(s.taken))}${st('Soul Shards earned', `<span style="color:#bfe8ff">${d.shards}</span>`)}</div>
      <div class="row"><button class="btn primary" data-a="tohub">Return to camp</button><button class="btn" data-a="retry">Start a new run</button></div>`;
  }
};
function fmtTime(t) { t = Math.floor(t); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; }
function shopDiscount() { return 1 - (Save.data.upgrades.discount || 0) * .06; }
function genShop() {
  const R = G.run, disc = shopDiscount(), items = [];
  for (let i = 0; i < 4; i++) { const it = genItem({ bonus: 6 }); items.push({ kind: 'item', item: it, price: Math.round(it.value * 1.6 * disc) }); }
  items.push({ kind: 'potion', name: 'Health Potion', desc: 'Restores 45% HP when drunk (Q). Also clears burning and poison.', price: Math.round((25 + R.depth * 4) * disc) });
  const el = pick(ELIXIRS); items.push({ kind: 'elixir', el, name: el.name, desc: el.desc, price: Math.round((55 + R.depth * 7) * disc) });
  const rare = chance(.15 + G.p.S.lf * .35); const b = pick(BOONS.filter(x => !!x.rare === rare && !x.mods.revive));
  items.push({ kind: 'boon', boon: b, rare, name: b.name, desc: `Power-up for this run: ${b.desc}`, price: Math.round((120 + R.depth * 14) * (rare ? 2 : 1) * disc) });
  return { items, rerolls: 0 };
}

/* ---------------- RANDOM EVENTS ---------------- */
const EVENTS = {
  shrine: { title: 'Shrine of Blood', text: (pp, p) => pp.used ? 'The shrine is silent now.' : 'A cracked obelisk hums with old power. It asks for blood. Sacrifice a quarter of your maximum health to receive a blessing.<br><span class="muted">Luck improves the chance of a rare blessing.</span>',
    choices: (pp, p) => pp.used ? [{ id: 'leave', label: 'Leave' }] : [{ id: 'pray', label: `Offer ${Math.round(p.S.maxHp * .25)} HP`, disabled: p.hp <= p.S.maxHp * .25 + 1 }, { id: 'leave', label: 'Leave' }] },
  gamble: { title: "The Gambler's Idol", text: (pp) => `A grinning idol with a coin slot in its mouth. Feed it gold and it spits out an item of random quality.<br><span class="muted">Price rises with every roll. Luck tips the odds.</span>`,
    choices: (pp, p) => { const c = gambleCost(pp); return [{ id: 'roll', label: `Roll for ${fmt(c)} gold`, disabled: p.gold < c }, { id: 'leave', label: 'Leave' }]; } },
  cursed: { title: 'Cursed Chest', text: (pp) => pp.used ? 'The chest lies open and empty.' : 'Black chains wrap an ornate chest. Opening it will curse this floor: enemies deal 40% more damage until you descend. Inside waits something precious.',
    choices: (pp) => pp.used ? [{ id: 'leave', label: 'Leave' }] : [{ id: 'opencursed', label: 'Break the chains' }, { id: 'leave', label: 'Leave it' }] },
  merchant: { title: 'Mysterious Merchant', text: (pp) => { if (!pp.offer) { const it = genItem({ minR: 2, bonus: 10 }); pp.offer = { item: it, price: Math.round(it.value * 1.3), boonPrice: Math.round((150 + G.run.depth * 15) * shopDiscount()) }; } const o = pp.offer; return `A hooded figure who was not here a moment ago. "One-time offer."<br>${o.item ? `<span style="color:${RARITIES[o.item.rar].color}">${esc(o.item.name)}</span> <span class="muted">(${RARITIES[o.item.rar].name}${o.item.power ? ', ' + POWERS[o.item.power].name : ''})</span> for ${fmt(o.price)} gold.` : 'The item is sold.'}<br>${o.boonSold ? 'The blessing is sold.' : `A rare power-up for ${fmt(o.boonPrice)} gold.`}`; },
    choices: (pp, p) => { const o = pp.offer; const c = []; if (o.item) c.push({ id: 'mitem', label: `Buy item (${fmt(o.price)}g)`, disabled: p.gold < o.price }); if (!o.boonSold) c.push({ id: 'mboon', label: `Buy rare power-up (${fmt(o.boonPrice)}g)`, disabled: p.gold < o.boonPrice }); c.push({ id: 'leave', label: 'Leave' }); return c; } },
  altar: { title: 'Altar of Wagers', text: (pp) => pp.used ? 'The altar has been answered.' : 'Carved words: <i>Summon a champion. Defeat it and claim a reward fit for kings.</i> The doors will seal until one of you falls.',
    choices: (pp) => pp.used ? [{ id: 'leave', label: 'Leave' }] : [{ id: 'accept', label: 'Accept the challenge' }, { id: 'leave', label: 'Walk away' }] }
};
function gambleCost(pp) { return Math.round((45 + G.run.depth * 8) * Math.pow(1.5, pp.rolls || 0)); }
function eventChoice(id) {
  const pp = G.modalData, p = G.p, R = G.run;
  switch (id) {
    case 'leave': UI.close(); return;
    case 'pray': p.hp -= p.S.maxHp * .25; pp.used = true; UI.close(); shake(4); Sfx.play('hurt'); grantBoon(chance(.2 + p.S.lf * .4)); return;
    case 'roll': { const c = gambleCost(pp); p.gold -= c; pp.rolls = (pp.rolls || 0) + 1; const it = genItem({ minR: chance(.5) ? 1 : 0, bonus: 8 }); dropItem(pp.x, pp.y + 14, it); Sfx.play('coin'); toast(`The idol spits out: ${it.name}`, 'r' + it.rar); UI.render(); return; }
    case 'opencursed': pp.used = true; R.curse = true; for (let i = 0; i < 2; i++) dropItem(pp.x + rand(-10, 10), pp.y + 14, genItem({ minR: 3 })); dropGold(pp.x, pp.y + 10, 40 * (1 + R.depth * .3)); Sfx.play('boss'); shake(6); fxBurst(pp.x, pp.y - 6, '#b060ff', 40, 90); toast('The floor is cursed! Enemies hit 40% harder.'); UI.close(); return;
    case 'mitem': { const o = pp.offer; if (p.gold < o.price) return; p.gold -= o.price; giveItem(o.item); o.item = null; Sfx.play('buy'); UI.render(); return; }
    case 'mboon': { const o = pp.offer; if (p.gold < o.boonPrice) return; p.gold -= o.boonPrice; o.boonSold = true; UI.close(); grantBoon(true); return; }
    case 'accept': { pp.used = true; UI.close(); const q = roomAt(pp.x, pp.y); if (q) { q.cleared = false; q.spawned = true; q.wave = 1; q.waves = 1; q.pending = 0; setDoors(q, true); spawnChampion(q); } banner('Champion', 'Prove your worth'); return; }
  }
}
function giveItem(it) {
  const p = G.p;
  if (p.inv.length >= 24) { dropPickup(p.x, p.y, 'item', { item: it }); toast('Backpack full — item dropped at your feet'); return false; }
  p.inv.push(it); return true;
}

/* ---------------- ACTIONS (all buttons route through here) ---------------- */
const ACT = {
  close() { if (G.modal === 'end') return; UI.close(); },
  cancel() { UI.confirm = null; UI.render(); },
  open(v) { if (G.state === 'hub' && v === 'menu') { UI.close(); return; } if (G.state !== 'play' && v !== 'settings') return; UI.open(v, v === 'shop' ? G.modalData : null); },
  sel(v) { UI.sel = UI.sel === v ? null : v; UI.render(); },
  equip(v) { const p = G.p, it = p.inv[+v]; if (!it) return; const cur = p.equip[it.slot]; p.equip[it.slot] = it; p.inv.splice(+v, 1); if (cur) p.inv.push(cur); recalc(p); Sfx.play('pickup'); UI.sel = 'eq:' + it.slot; UI.render(); },
  unequip(v) { const p = G.p; if (p.inv.length >= 24) { toast('Backpack full'); Sfx.play('error'); return; } p.inv.push(p.equip[v]); p.equip[v] = null; recalc(p); UI.sel = null; UI.render(); },
  sell(v) { const p = G.p, it = p.inv[+v]; if (!it) return; const g = Math.round(it.value * .5); p.gold += g; p.inv.splice(+v, 1); Sfx.play('coin'); toast(`Sold ${it.name} for ${g} gold`); UI.sel = null; UI.render(); },
  learn(v) { const p = G.p; if (p.ap <= 0) return; const rk = p.abil[v] || 0; if (rk >= 5) return; p.ap--; p.abil[v] = rk + 1; if (!rk) { const i = p.slots.indexOf(null); if (i >= 0) p.slots[i] = v; } Sfx.play('levelup'); G.hudDirty = true; UI.render(); },
  slot(v) { const p = G.p; const [id, i] = v.split(':'); const old = p.slots.indexOf(id); const prev = p.slots[+i]; p.slots[+i] = id; if (old >= 0 && old !== +i) p.slots[old] = prev || null; G.hudDirty = true; UI.render(); },
  levelpick(v) { const p = G.p, u = G.levelChoices[+v]; u.apply(p); recalc(p); G.levelChoices = null; G.pendingLevel--; Sfx.play('pickup'); if (G.pendingLevel > 0) UI.render(); else UI.close(); },
  shopsel(v) { UI.sel = +v; UI.render(); },
  buy(v) {
    const p = G.p, S = G.modalData.shop, o = S.items[+v]; if (!o || o.sold || p.gold < o.price) return;
    if (o.kind === 'potion') { if (p.potions >= p.maxPotions) { toast('Your potion belt is full'); Sfx.play('error'); return; } p.potions++; p.gold -= o.price; Sfx.play('buy'); UI.render(); return; }
    if (o.kind === 'item') { if (p.inv.length >= 24) { toast('Backpack full'); Sfx.play('error'); return; } p.inv.push(o.item); registerFind(o.item); }
    if (o.kind === 'elixir') addBuff(p, 'el_' + o.el.id, o.el.name, o.el.dur, o.el.mods, o.el.c);
    p.gold -= o.price; o.sold = true; Sfx.play('buy');
    Save.data.stats.bought++; if (Save.data.stats.bought >= 15) unlockAch('shopper');
    if (o.kind === 'boon') { addMod(p, o.boon.mods); p.boons.push(o.boon.id); toast(`Power-up: ${o.boon.name}`); }
    UI.sel = null; UI.render();
  },
  reroll() {
    const p = G.p, S = G.modalData.shop; const rr = Math.round((30 + G.run.depth * 5) * (1 + S.rerolls * .6) * shopDiscount());
    if (p.gold < rr) return; p.gold -= rr; const ns = genShop(); ns.rerolls = S.rerolls + 1; G.modalData.shop = ns; Sfx.play('coin'); UI.sel = null; UI.render();
  },
  evchoice(v) { eventChoice(v); },
  savequit() { saveRun(); UI.close(); toHub(); toast('Run saved'); },
  abandon() { UI.confirm = 'abandon'; UI.render(); },
  abandon2() { UI.close(); endRun('death', true); },
  tohub() { UI.close(); toHub(); },
  retry() { UI.close(); toHub(); ACT.start(); },
  // hub
  hubtab(v) { G.hubTab = v; renderHub(); },
  pickcls(v) { Save.data.last.cls = v; renderHub(); },
  pickregion(v) { if (+v < Save.data.unlocked) { Save.data.last.region = +v; renderHub(); } },
  buyregion(v) { const i = +v, c = regionCost(i); if (Save.data.shards < c || i !== Save.data.unlocked) return; Save.data.shards -= c; Save.data.unlocked = i + 1; Save.data.last.region = i; Save.write(); Sfx.play('buy'); renderHub(); },
  pickdiff(v) { if (diffUnlocked(+v)) { Save.data.last.diff = +v; renderHub(); } },
  mode(v) { if (+v && !endlessUnlocked()) return; Save.data.last.endless = +v; renderHub(); },
  start() { const L = Save.data.last; Save.write(); newRun(L.cls, Math.min(L.region, Save.data.unlocked - 1), diffUnlocked(L.diff) ? L.diff : 1, !!L.endless && endlessUnlocked()); },
  cont() { loadRun(); },
  dropsave() { if (UI.confirm !== 'dropsave') { UI.confirm = 'dropsave'; renderHub(); return; } Save.data.run = null; Save.write(); UI.confirm = null; renderHub(); },
  upgrade(v) { const U = UPGRADES.find(u => u.id === v), l = Save.data.upgrades[v] || 0; if (l >= U.max) return; const c = U.cost(l); if (Save.data.shards < c) return; Save.data.shards -= c; Save.data.upgrades[v] = l + 1; Save.write(); Sfx.play('buy'); renderHub(); },
  toggle(v) { Save.data.settings[v] = Save.data.settings[v] ? 0 : 1; Save.write(); if (G.state === 'hub' && !G.modal) renderHub(); else UI.render(); },
  reset1() { UI.confirm = 'reset'; renderHub(); },
  reset2() { Save.reset(); UI.confirm = null; G.hubTab = 'play'; renderHub(); toast('Save data reset'); },
  sound() { Sfx.init(); Sfx.applyVol(); Music.play('hub', HUB_MUSIC); toast('Sound on'); renderHub(); }
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el || el.disabled) return;
  Sfx.init(); Sfx.play('select');
  const f = ACT[el.dataset.a]; if (f) f(el.dataset.v, el);
});
document.addEventListener('input', e => {
  const el = e.target; if (!el.dataset || !el.dataset.set) return;
  Save.data.settings[el.dataset.set] = +el.value; Sfx.init(); Sfx.applyVol(); Save.write();
  const out = document.getElementById('o-' + el.dataset.set); if (out) out.textContent = Math.round(el.value * 100) + '%';
});
function settingsHTML() {
  const s = Save.data.settings;
  return `<div class="sec"><div class="range"><label for="set-sfx" style="width:120px">Sound effects</label><input id="set-sfx" type="range" min="0" max="1" step="0.05" value="${s.sfx}" data-set="sfx"><span id="o-sfx" class="tabnum" style="width:48px">${Math.round(s.sfx * 100)}%</span></div>
  <div class="range"><label for="set-music" style="width:120px">Music</label><input id="set-music" type="range" min="0" max="1" step="0.05" value="${s.music}" data-set="music"><span id="o-music" class="tabnum" style="width:48px">${Math.round(s.music * 100)}%</span></div>
  <div class="row"><button class="btn small" data-a="toggle" data-v="shake">Screen shake: ${s.shake ? 'On' : 'Off'}</button><button class="btn small" data-a="toggle" data-v="numbers">Damage numbers: ${s.numbers ? 'On' : 'Off'}</button></div>
  ${Save.ok ? '<div class="note">Progress saves automatically in this browser.</div>' : '<div class="note bad">This browser is blocking storage, so progress will not be kept after you close the page.</div>'}</div>`;
}

/* ---------------- HUB (camp between runs) ---------------- */
const HUB_MUSIC = { root: 98, scale: [0, 2, 4, 7, 9], tempo: 58, seed: 7 };
const regionCost = i => 120 + i * 90;
const bossesBeaten = () => Object.keys(Save.data.bossKills).length;
const diffUnlocked = i => bossesBeaten() >= DIFFS[i].req;
const endlessUnlocked = () => bossesBeaten() >= 1;
function renderHub() {
  const S = Save.data, L = S.last, tab = G.hubTab || 'play';
  const tabs = [['play', 'Expedition'], ['upgrades', 'Upgrades'], ['armory', 'Armory'], ['achievements', 'Achievements'], ['bestiary', 'Bestiary'], ['settings', 'Settings']];
  let h = `<div class="logo">${BUILD.home ? `<a class="btn small" style="width:max-content;text-decoration:none" href="${esc(BUILD.home)}">← Bas Games</a>` : ''}<h1>Ashen<br>Depths</h1><p>Descend through ten cursed regions. Die, grow stronger, go deeper.</p><div class="shards px"><i></i>${fmt(S.shards)} Soul Shards</div>
    <div class="tabs" style="max-width:420px">${tabs.map(t => `<button class="btn small ${tab === t[0] ? 'on' : ''}" data-a="hubtab" data-v="${t[0]}">${t[1]}</button>`).join('')}</div>
    ${Sfx.ctx ? '' : '<div><button class="btn small" data-a="sound">Turn sound on</button></div>'}
    <div class="note">WASD move · Mouse aim & attack · 1-4 abilities · Space dash · Q potion · E interact · Esc menu</div><div class="note">v${esc(BUILD.version)}${BUILD.env === 'staging' ? ' · staging (separate save)' : ''}</div></div><div class="hubpanel px">`;
  if (tab === 'play') {
    if (S.run) {
      const r = S.run;
      h += `<div class="sec"><h3>Saved run</h3><div class="li"><div><div class="t">${esc(CLASSES[r.cls].name)} · Level ${r.player.level}</div><div class="d">${esc(BIOMES[r.bi].name)} · Floor ${r.floorNum} · ${DIFFS[r.diff].name}${r.endless ? ' · Endless' : ''}</div></div><div class="row"><button class="btn primary" data-a="cont">Continue</button>${UI.confirm === 'dropsave' ? '<button class="btn danger small" data-a="dropsave">Confirm abandon</button>' : '<button class="btn small" data-a="dropsave">Abandon</button>'}</div></div></div>`;
    }
    h += `<div class="sec"><h3>Class</h3><div class="cls">${Object.keys(CLASSES).map(k => `<button class="card ${L.cls === k ? 'on' : ''}" style="--cc:${CLASSES[k].color}" data-a="pickcls" data-v="${k}"><img alt="" src="${spriteURL('human', CLASSES[k].pal)}"><span class="t">${CLASSES[k].name}</span></button>`).join('')}</div>`;
    const C = CLASSES[L.cls];
    h += `<div class="clsinfo"><b>${esc(C.desc)}</b><br>Passive · <span class="gold">${esc(C.passive.name)}</span>: ${esc(C.passive.desc)}<br>Abilities: ${C.abilities.map(a => ABILITIES[a].name).join(', ')}<br>Starts with a ${WEAPON_TYPES[C.weapon].name.toLowerCase()} · HP ${C.base.hp} · ${C.res} ${C.base.mp} · Speed ${C.base.speed}</div></div>`;
    h += `<div class="sec"><h3>Region</h3><div class="regions">${BIOMES.map((B, i) => {
      const un = i < S.unlocked, next = i === S.unlocked;
      return `<button class="card ${L.region === i && un ? 'on' : ''} ${un ? '' : 'locked'}" data-a="${un ? 'pickregion' : 'noop'}" data-v="${i}" style="--cc:${un ? '#eadfc4' : '#6a5f70'}"><span class="t">${i + 1}. ${esc(B.name)}</span><span class="d">${un ? 'Boss: ' + esc(BOSSES[B.boss].name.replace(/^The /, '')) : next ? `Defeat ${esc(BOSSES[BIOMES[i - 1].boss].name.replace(/^The /, ''))}` : 'Locked'}</span>${S.bossKills[B.boss] ? '<span class="gold" style="font-size:16px">Boss defeated</span>' : ''}</button>`;
    }).join('')}</div>${S.unlocked < 10 ? `<div class="row"><button class="btn small" data-a="buyregion" data-v="${S.unlocked}" ${S.shards >= regionCost(S.unlocked) ? '' : 'disabled'}>Unlock ${esc(BIOMES[S.unlocked].name)} for ${regionCost(S.unlocked)} shards</button><span class="note">Starting deeper gives bonus levels to match.</span></div>` : ''}</div>`;
    h += `<div class="sec"><h3>Difficulty</h3><div class="row">${DIFFS.map((D, i) => `<button class="btn small ${L.diff === i ? 'on primary' : ''}" data-a="pickdiff" data-v="${i}" ${diffUnlocked(i) ? '' : 'disabled'} title="${diffUnlocked(i) ? '' : `Defeat ${D.req} different bosses to unlock`}" style="color:${D.c}">${D.name}</button>`).join('')}</div><div class="note">${(() => { const D = DIFFS[L.diff]; return `${D.name}: enemy HP x${D.hp}, damage x${D.dmg}, elites ${Math.round(D.elite * 100)}%, healing x${D.heal}, loot x${D.loot}, XP x${D.xp}, shards x${D.shards}.`; })()} ${DIFFS.some((D, i) => !diffUnlocked(i)) ? `Harder modes unlock as you defeat more bosses (${bossesBeaten()} so far).` : ''}</div></div>`;
    h += `<div class="sec"><h3>Mode</h3><div class="row"><button class="btn small ${!L.endless ? 'on primary' : ''}" data-a="mode" data-v="0">Standard</button><button class="btn small ${L.endless ? 'on primary' : ''}" data-a="mode" data-v="1" ${endlessUnlocked() ? '' : 'disabled'}>Endless</button><span class="note">${endlessUnlocked() ? 'Endless: regions loop forever and keep getting harder. A boss every third floor.' : 'Endless unlocks after your first boss kill.'}</span></div></div>`;
    h += `<div class="row"><button class="btn primary" style="font-size:16px;padding:14px 26px 16px" data-a="start">Enter the depths</button>${S.run ? '<span class="note">Starting a new run replaces your saved run.</span>' : ''}</div>`;
  } else if (tab === 'upgrades') {
    h += `<div class="sec"><h3>Permanent upgrades</h3><div class="note">Soul Shards are earned at the end of every run, from bosses and from achievements.</div><div class="list">${UPGRADES.map(U => { const l = S.upgrades[U.id] || 0, c = U.cost(l), max = l >= U.max; return `<div class="li ${max ? 'done' : ''}"><div><div class="t">${esc(U.name)} <span class="pips">${Array.from({ length: U.max }, (_, i) => `<i class="${i < l ? 'on' : ''}"></i>`).join('')}</span></div><div class="d">${esc(U.desc)}</div></div>${max ? '<span class="gold" style="font:11px var(--f-display)">MAX</span>' : `<button class="btn small" data-a="upgrade" data-v="${U.id}" ${S.shards >= c ? '' : 'disabled'}>${c} shards</button>`}</div>`; }).join('')}</div></div>`;
  } else if (tab === 'armory') {
    h += `<div class="sec"><h3>Weapon collection</h3><div class="best">${Object.keys(WEAPON_TYPES).map(k => { const r = S.armory.cats[k]; const col = r ? RARITIES[r - 1].color : '#3a3342'; return `<div class="li"><img class="pix" alt="" style="width:40px;height:40px" src="${itemIcon(k, col).url}"><div><div class="t">${WEAPON_TYPES[k].name}</div><div class="d">${r ? 'Best: <span style="color:' + col + '">' + RARITIES[r - 1].name + '</span>' : 'Not found yet'}</div></div></div>`; }).join('')}</div></div>`;
    h += `<div class="sec"><h3>Unique legendaries ${Object.keys(S.armory.uniques).length} / ${UNIQUES.length}</h3><div class="best">${UNIQUES.map(u => { const f = S.armory.uniques[u.name]; return `<div class="li"><img class="pix" alt="" style="width:40px;height:40px" src="${itemIcon(u.type, f ? '#f0a830' : '#2a2433').url}"><div><div class="t" style="color:${f ? '#f0a830' : '#6a5f70'}">${f ? esc(u.name) : '???'}</div><div class="d">${f ? esc(POWERS[u.power].desc) : WEAPON_TYPES[u.type].name}</div></div></div>`; }).join('')}</div></div>`;
    const st = S.stats;
    h += `<div class="sec"><h3>Records</h3><div class="statgrid"><div><span>Runs</span><b>${st.runs}</b></div><div><span>Victories</span><b>${st.victories}</b></div><div><span>Enemies killed</span><b>${fmt(st.kills)}</b></div><div><span>Chests opened</span><b>${st.chests}</b></div><div><span>Deepest floor</span><b>${st.bestFloor}</b></div><div><span>Best endless floor</span><b>${st.bestEndless}</b></div><div><span>Legendaries found</span><b>${st.legendaries}</b></div><div><span>Shards earned</span><b>${fmt(S.totalShards)}</b></div></div>${S.armory.best ? `<div class="note">Best item ever found: <span style="color:${RARITIES[S.armory.best.rar].color}">${esc(S.armory.best.name)}</span></div>` : ''}</div>`;
  } else if (tab === 'achievements') {
    const n = ACHIEVEMENTS.filter(a => S.achievements[a.id]).length;
    const B = S.bonus;
    h += `<div class="sec"><h3>Achievements ${n} / ${ACHIEVEMENTS.length}</h3><div class="note">Permanent bonuses so far: +${B.luck || 0} Luck, +${Math.round((B.dmg || 0) * 100)}% damage, +${Math.round((B.hp || 0) * 100)}% max HP, +${Math.round((B.speed || 0) * 100)}% move speed.</div><div class="list">${ACHIEVEMENTS.map(a => { const d = S.achievements[a.id]; return `<div class="li ${d ? 'done' : ''}"><div><div class="t" style="color:${d ? '#e8b04a' : '#8a7f90'}">${esc(a.name)}</div><div class="d">${esc(a.desc)}</div></div><span class="${d ? 'good' : 'muted'}" style="font-size:17px;text-align:right">${esc(rewardText(a.reward))}</span></div>`; }).join('')}</div></div>`;
  } else if (tab === 'bestiary') {
    const ids = Object.keys(ENEMIES);
    const seen = ids.filter(k => S.bestiary[k]).length;
    h += `<div class="sec"><h3>Bosses</h3><div class="best">${Object.keys(BOSSES).map(k => { const b = S.bestiary['boss_' + k], D = BOSSES[k]; return `<div class="li"><img class="pix" alt="" style="width:40px;height:40px;${b ? '' : 'filter:brightness(0)'}" src="${spriteURL(D.tpl, D.pal)}"><div><div class="t">${b ? esc(D.name) : '???'}</div><div class="d">${b ? `Defeated ${b.kills}x · ${esc(D.desc)}` : 'Not encountered'}</div></div></div>`; }).join('')}</div></div>`;
    h += `<div class="sec"><h3>Creatures ${seen} / ${ids.length}</h3><div class="best">${ids.map(k => { const b = S.bestiary[k], D = ENEMIES[k]; return `<div class="li"><img class="pix" alt="" style="width:40px;height:40px;${b ? '' : 'filter:brightness(0)'}" src="${spriteURL(D.tpl, D.pal)}"><div><div class="t">${b ? esc(D.name) : '???'}</div><div class="d">${b ? `Killed ${b.kills} · ${esc(D.desc)}` : 'Not encountered'}</div></div></div>`; }).join('')}</div></div>`;
  } else if (tab === 'settings') {
    h += `<div class="sec"><h3>Settings</h3>${settingsHTML()}</div><div class="sec"><h3>Save data</h3><div class="note">Resetting erases shards, upgrades, unlocks, achievements, the bestiary and any saved run. Audio settings are kept.</div><div class="row">${UI.confirm === 'reset' ? '<button class="btn danger" data-a="reset2">Yes, erase everything</button><button class="btn" data-a="cancel2">Cancel</button>' : '<button class="btn danger" data-a="reset1">Reset save</button>'}</div></div>`;
  }
  h += `</div>`;
  const hub = $('#hub'); const sc = hub.scrollTop; hub.innerHTML = h; hub.scrollTop = sc;
}
ACT.cancel2 = () => { UI.confirm = null; renderHub(); };
ACT.noop = () => { };
