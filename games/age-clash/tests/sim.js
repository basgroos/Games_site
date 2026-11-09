/* Age Clash: regels van de simulatie, determinisme en bots (tegen de gebouwde pagina). */
const { load, ok, run, done } = require('./helpers');
const P = load(), AC = P.w.AC;

function playBots(d0, d1, seed, maxSec = 1500) {
  const sim = new AC.Sim({ seed, players: [{ maxAge: 7 }, { maxAge: 7 }] });
  const b = [new AC.Bot(sim, 0, d0, seed + 1), new AC.Bot(sim, 1, d1, seed + 2)];
  while (!sim.over && sim.time < maxSec) { b[0].update(sim.dt); b[1].update(sim.dt); sim.tick(); sim.events.length = 0; }
  return sim;
}

(async () => {
  await run('data: 8 tijdperken × 4 units, 3 towers', () => {
    ok(AC.AGES.length === 8 && AC.UNITS.every((r) => r.length === 4), 'tijdperken/units');
    ok(AC.TOWERS.length === 3, 'towers');
    ok(AC.CONST.START_IRON === 500 && AC.CONST.BASE_INCOME === 10, 'economie');
    ok(AC.ITEMS.length === 8 && AC.ITEMS.every((it) => AC.ITEM_TYPES[it.type]), 'items');
    ok(AC.CONST.SLOT_CD.join() === '2,2,4,4', 'cooldowns');
  });
  await run('startcollectie: 1–2 compleet, 3–5 zonder armored, 6–8 dicht', () => {
    const o = AC.AGES.map((a) => a.startOwned.join(''));
    ok(o[0] === '1111' && o[1] === '1111' && o.slice(2, 5).every((x) => x === '1110') && o.slice(5).every((x) => x === '0000'), o.join(' '));
  });
  await run('spawnen kost ijzer en respecteert de cooldown', () => {
    const s = new AC.Sim({ seed: 3, players: [{}, {}] });
    s.command(0, { t: 'spawn', s: 0 }); s.tick();
    ok(s.units.length === 1 && Math.abs(s.players[0].iron - (500 - 60 + 10 * s.dt)) < 1e-6, 'iron ' + s.players[0].iron);
    s.command(0, { t: 'spawn', s: 0 }); s.tick();
    ok(s.units.length === 1, 'cooldown genegeerd');
    for (let i = 0; i < 61; i++) s.tick();
    s.command(0, { t: 'spawn', s: 0 }); s.tick();
    ok(s.units.length === 2, 'na 2 s niet opnieuw te plaatsen');
  });
  await run('upgrades worden duurder en werken', () => {
    const s = new AC.Sim({ seed: 3, players: [{}, {}] });
    s.players[0].iron = 1e6;
    const c0 = s.upgradeCost(0, 'income'); s.command(0, { t: 'upg', k: 'income' }); s.tick();
    ok(s.upgradeCost(0, 'income') > c0 && s.income(0) === 13, 'inkomen ' + s.income(0));
  });
  await run('slot 5: ieder tijdperk-item werkt, kost ijzer en heeft een cooldown', () => {
    const out = {};
    for (let age = 0; age < 8; age++) {
      const s = new AC.Sim({ seed: 9, players: [{}, {}] });
      const p = s.players[0]; p.age = age; p.iron = 1e6; p.itemCd = 0; s.players[1].iron = 1e6;
      for (let i = 0; i < 4; i++) { s.command(0, { t: 'spawn', s: i }); s.command(1, { t: 'spawn', s: i }); }
      for (let i = 0; i < 240; i++) s.tick(); // legers ontmoeten elkaar
      s.units.filter((u) => u.side === 0).forEach((u) => { u.hp = u.maxHp * 0.3; });
      s.units.filter((u) => u.side === 1).forEach((u) => { u.hp = u.maxHp = u.maxHp * 1000; }); // geen kills: kill-bonus zou de ijzer-check verstoren
      const enHp = () => s.units.filter((u) => u.side === 1).reduce((a, u) => a + u.hp, 0);
      const myHp = () => s.units.filter((u) => u.side === 0).reduce((a, u) => a + u.hp, 0);
      const it = AC.ITEMS[age], iron0 = p.iron, e0 = enHp(), m0 = myHp();
      s.command(0, { t: 'item' }); s.tick();
      ok(p.st.items === 1 && Math.abs(iron0 + s.income(0) * s.dt - p.iron - AC.itemCost(age)) < 1e-6, it.name + ': kosten');
      ok(p.itemCd > it.cd - 0.1, it.name + ': cooldown');
      s.command(0, { t: 'item' }); s.tick(); ok(p.st.items === 1, it.name + ': cooldown genegeerd');
      if (it.type === 'potion') ok(myHp() > m0 * 1.5, it.name + ': geneest niet');
      if (it.id === 'ra') ok(p.dmgBuffT > 7 && s._dmgMult(0, 0) > 1.4, it.name + ': geen schadebuff');
      if (it.id === 'adrenaline') ok(p.hasteT > 7, it.name + ': geen haast');
      if (it.type === 'damager') { for (let i = 0; i < 45; i++) s.tick(); ok(enHp() < e0, it.name + ': geen schade'); }
      if (it.id === 'timefreeze') ok(s.units.filter((u) => u.side === 1).every((u) => u.stun > 1), it.name + ': bevriest niet');
      out[it.id] = 'ok';
    }
    return Object.keys(out).length;
  });
  await run('tijdperk ontgrendelen geeft de eerste 3 units gratis', () => {
    const d = AC.Profile.data; d.coins = 5000; d.agesOwned[5] = 0; d.owned[5] = [0, 0, 0, 0];
    ok(AC.Profile.buyAge(5), 'kopen');
    ok(d.owned[5].join('') === '1110' && d.coins === 5000 - AC.AGES[5].unlockCost, 'gratis units: ' + d.owned[5].join(''));
    d.agesOwned[6] = 1; d.owned[6] = [0, 0, 0, 1]; AC.Profile._fix();
    ok(d.owned[6].join('') === '1111', 'oude save krijgt ze ook');
  });
  await run('anti-armor doet extra schade tegen armored', () => {
    const s = new AC.Sim({ seed: 3, players: [{}, {}] });
    s.players[1].iron = 1e5; s.command(1, { t: 'spawn', s: 3 }); s.tick();
    const tank = s.units[0], hp0 = tank.hp;
    s._damage({ side: 0, slot: 2, aa: true, ranged: false }, tank, 10); const aa = hp0 - tank.hp;
    const hp1 = tank.hp; s._damage({ side: 0, slot: 0, aa: false, ranged: false }, tank, 10); const mel = hp1 - tank.hp;
    ok(aa > mel * 4, `aa ${aa} vs melee ${mel}`);
  });
  await run('determinisme: zelfde seed + commando\'s = zelfde match', () => {
    const a = playBots('normal', 'hard', 42, 300), b = playBots('normal', 'hard', 42, 300);
    ok(a.hash() === b.hash(), 'hash verschilt');
  });
  await run('bots: Hard wint meestal van Easy, matches eindigen', () => {
    let wins = 0, times = [];
    for (let i = 0; i < 4; i++) { const s = playBots('hard', 'easy', 100 + i); ok(s.over, 'match eindigde niet'); if (s.winner === 0) wins++; times.push(Math.round(s.time)); }
    ok(wins >= 3, 'hard won ' + wins + '/4');
    return { wins, times };
  });
  done();
})();
