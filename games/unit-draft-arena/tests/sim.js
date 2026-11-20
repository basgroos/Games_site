/* Unit Draft Arena simulation test: data integrity, every ability, mirror fairness and balance over AI-vs-AI drafts. */
const { load, ok } = require('./helpers');
const { E, errors } = load();
let failed = 0;
function run(label, fn) {
  try { const r = fn(); console.log('OK  ', label, r !== undefined ? JSON.stringify(r) : ''); }
  catch (e) { failed++; console.log('FAIL', label, e.stack.split('\n').slice(0, 3).join(' | ')); }
}
E(`
  globalThis.T_side = (ids, buffs, abs, team, coins) => { const defs = ids.map(i => UNIT[i]); const pos = autoPlace(defs, team);
    return { units: defs.map((d, i) => ({ def: d, cx: pos[i].cx, cy: pos[i].cy })), buffs: (buffs || []).map(b => ({ def: BUFF[b] })), abilities: (abs || []).map(a => ABILITY[a]), coins: coins || 0, ai: true, level: 'normal' }; };
  globalThis.T_fight = (a, b) => { const B = createBattle([a, b]); let g = 0; while (!B.over && g++ < 9000) { stepBattle(B, 1 / 30); B.fx.length = 0; } return B; };
`);
run('content: 27 units, 18 buffs, 18 abilities, every rarity present', () => {
  ok(E('UNITS.length') >= 20 && E('BUFFS.length') >= 15 && E('ABILITIES.length') >= 15, 'not enough content');
  for (const list of ['UNITS', 'BUFFS', 'ABILITIES']) ok(E(`RARITIES.every(r => ${list}.some(d => d.rar === r.id))`), list + ' misses a rarity');
  ok(E('RARITIES.reduce((s, r) => s + r.weight, 0)') === 100, 'rarity weights do not add up to 100');
  ok(E('ABILITIES.every(a => ICON_PATHS[a.icon] && a.cd > 0 && a.desc)'), 'ability without icon/cooldown/description');
  ok(E('BUFFS.every(b => ICON_PATHS[b.icon] && b.desc)'), 'buff without icon/description');
  ok(E('UNITS.every(u => u.hp > 0 && u.dmg > 0 && u.as > 0 && u.ms > 0 && u.rng > 0 && u.spName && u.look)'), 'unit with missing stats');
  return { units: E('UNITS.length'), buffs: E('BUFFS.length'), abilities: E('ABILITIES.length') };
});
run('drafts: 10-12 lots, at least 5 units, 2 buffs and 2 abilities', () => {
  for (let i = 0; i < 200; i++) {
    const r = E('(() => { const L = generateDraft(); return [L.length, L.filter(l => l.kind === "unit").length, L.filter(l => l.kind === "buff").length, L.filter(l => l.kind === "ability").length, L.every(l => l.start === RAR[l.def.rar].price)]; })()');
    ok(r[0] >= 10 && r[0] <= 12 && r[1] >= 5 && r[2] >= 2 && r[3] >= 2 && r[4], 'bad draft ' + r);
  }
});
run('AI never bids more than it has', () => {
  for (let i = 0; i < 300; i++) ok(E('(() => { const me = { coins: Math.floor(Math.random() * 21), units: [], buffs: [], abilities: [] }; const L = generateDraft(); return L.every(l => aiMaxBid(l, me, L, pick(AI_NAMES), "hard") <= me.coins); })()'), 'overbid');
});
run('every ability can be cast and every buff applied without errors', () => {
  const ids = E('ABILITIES.map(a => a.id)');
  for (const id of ids) E(`(() => { const B = createBattle([T_side(['knight','archer','acolyte'], BUFFS.map(b => b.id), ['${id}'], 0), T_side(['militia','firemage','tank'], [], [], 1)]);
      for (let i = 0; i < 200; i++) stepBattle(B, 1/30);
      const ab = B.teams[0].abilities[0]; ab.cd = 0;
      if ('${id}' === 'resurrect') { const d = B.alive[0][0]; d.soulUsed = true; d.rebirthUsed = true; killUnit(B, d, null); refreshAlive(B); }
      const tgt = { x: B.alive[1][0].x, y: B.alive[1][0].y, unit: B.alive[0][0] };
      if (!castAbility(B, 0, ab, tgt)) throw new Error('could not cast ${id}');
      for (let i = 0; i < 200; i++) stepBattle(B, 1/30); })()`);
  return { abilities: ids.length };
});
run('mirror matches are fair (no big side bias)', () => {
  const w = E(`(() => { const w = [0, 0, 0]; for (let i = 0; i < 160; i++) { const B = T_fight(T_side(['knight','archer','acolyte','militia','firemage'], ['sharp'], ['meteor','heal'], 0), T_side(['knight','archer','acolyte','militia','firemage'], ['sharp'], ['meteor','heal'], 1)); w[B.winner < 0 ? 2 : B.winner]++; } return w; })()`);
  ok(w[0] >= 45 && w[1] >= 45, 'side bias ' + w);
  return w;
});
run('balance over AI-vs-AI drafts: mythic does not auto-win, cheap teams can win', () => {
  const s = E(`(() => {
    const st = { myth: [0, 0], cheap: [0, 0], over: 0 }, N = 220;
    for (let g = 0; g < N; g++) {
      const lots = generateDraft(); const P = [0, 1].map(() => ({ coins: 20, units: [], buffs: [], abilities: [], pers: pick(AI_NAMES) }));
      lots.forEach((l, i) => { const left = lots.slice(i + 1), m = P.map(p => aiMaxBid(l, p, left, p.pers, 'normal')); const hi = m[0] === m[1] ? (Math.random() < .5 ? 0 : 1) : m[0] > m[1] ? 0 : 1;
        if (m[hi] < l.start) return; const price = Math.max(l.start, Math.min(m[hi], m[1 - hi] + 1)); P[hi].coins -= price;
        (l.kind === 'unit' ? P[hi].units : l.kind === 'buff' ? P[hi].buffs : P[hi].abilities).push({ def: l.def }); });
      P.forEach(p => { p.units.push({ def: RECRUIT }); p.units = p.units.map(x => x.def); p.buffs = p.buffs.map(x => x.def); p.abilities = p.abilities.map(x => x.def); });
      const side = (p, t) => { const pos = autoPlace(p.units, t); return { units: p.units.map((d, i) => ({ def: d, cx: pos[i].cx, cy: pos[i].cy })), buffs: p.buffs.map(d => ({ def: d })), abilities: p.abilities, coins: p.coins, ai: true }; };
      const B = T_fight(side(P[0], 0), side(P[1], 1)); if (!B.over) st.over++;
      const w = B.winner; if (w < 0) continue;
      const hm = P.map(p => p.units.concat(p.buffs, p.abilities).some(d => d.rar === 'mythic'));
      if (hm[0] !== hm[1]) { st.myth[0]++; if (w === (hm[0] ? 0 : 1)) st.myth[1]++; }
      P.forEach((p, k) => { const avg = p.units.reduce((s, d) => s + RAR[d.rar].tier, 0) / p.units.length; if (avg <= 0.5) { st.cheap[0]++; if (w === k) st.cheap[1]++; } });
    }
    return st; })()`);
  ok(s.over === 0, s.over + ' battles never ended');
  if (s.myth[0] >= 15) ok(s.myth[1] / s.myth[0] < 0.8, 'mythic holders win too often ' + s.myth);
  ok(s.cheap[0] >= 15 && s.cheap[1] / s.cheap[0] > 0.2, 'cheap teams almost never win ' + s.cheap);
  return { mythicWins: s.myth[1] + '/' + s.myth[0], cheapWins: s.cheap[1] + '/' + s.cheap[0] };
});
run('no page errors', () => ok(errors.length === 0, errors.join(' | ')));
if (failed) { console.log(failed + ' failed'); process.exit(1); }
console.log('Unit Draft Arena sim: all passed');
process.exit(0);
