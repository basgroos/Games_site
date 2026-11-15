/* Staff Siege co-op over een gesimuleerde Supabase Realtime (met en zonder berichtverlies):
   kamer maken, meedoen, roster met loadouts, starten, snapshots, bewegen en specials als gast,
   kills en gedeelde beloningen, een gast die weggaat, game over voor iedereen en terug naar de kamer. */
const { load, ok, sleep, run, done } = require('./helpers');
const { makeBus } = require('./fakesupa');
const allErrors = [];
async function suite(drop, n) {
  const bus = makeBus({ drop });
  const mk = (name) => {
    const b = load({ before(w) { w.HW_BUILD = { env: 'live', version: 'test', home: '', online: { url: 'https://example.supabase.co', key: 'test' } }; w.supabase = bus.supabase; } });
    b.E(`profileSetName('${name}');S.burgers=500`); b.name = name; return b;
  };
  const all = ['Host', 'Gast', 'Derde'].slice(0, n).map(mk), [A, B, C] = all;
  const settle = async () => { for (let i = 0; i < 6; i++) { await Promise.resolve(); bus.flush(); await new Promise((r) => setImmediate(r)); } };
  const beat = async (dt = 1.6, times = 4) => { for (let i = 0; i < times; i++) { all.forEach((b) => b.E(`NET.tick(${dt})`)); await settle(); } };
  const frames = async (f) => { for (let i = 0; i < f; i += 3) { A.E('for(let i=0;i<3;i++){if(G.state==="play")update(1/60);NET.tick(1/60)}'); for (const g of all.slice(1)) g.E('for(let i=0;i<3;i++){if(G.state==="play"&&G.net==="guest")clientTick(1/60);NET.tick(1/60)}'); await settle(); } };
  const god = () => A.E('for(const p of PLAYERS){p.P.maxhp=Math.max(p.P.maxhp,1e7);p.P.hp=1e7}');
  const tag = `(${Math.round(drop * 100)}% verlies, ${n} spelers)`;
  let code;
  await run('kamer maken en meedoen ' + tag, async () => {
    code = A.E('NET.host()'); await settle();
    ok(/^[A-Z]{4}$/.test(code), 'geen code: ' + code);
    for (const g of all.slice(1)) g.E(`NET.join('${code}')`);
    await settle(); await beat();
    ok(A.E('NET.roster.length') === n, 'host roster ' + A.E('NET.roster.length'));
    for (const g of all.slice(1)) ok(g.E('NET.roster.length') === n, g.name + ' roster ' + g.E('NET.roster.length'));
    return { code };
  });
  await run('loadout van een gast verschijnt bij de host ' + tag, async () => {
    B.E("S.staffs.volt={lvl:3,n:3,m:2,mx:0};S.classes.mage={lvl:2,n:2,m:1,mx:0};S.eqStaff='volt';S.eqClass='mage'"); await beat();
    const r = JSON.parse(A.E(`JSON.stringify(NET.roster.find(r=>r.name==='Gast'))`));
    ok(r.staff === 'volt' && r.cls === 'mage' && r.pr.so.lvl === 3, 'loadout niet doorgekomen: ' + JSON.stringify(r));
    A.E('openPanel("mp")'); ok(A.dom.window.document.querySelectorAll('#mpBody .mpp').length === n, 'kamerlijst toont niet iedereen');
  });
  await run('host start, iedereen zit in hetzelfde potje ' + tag, async () => {
    ok(A.E('NET.startMatch()') === true, 'starten mislukt'); await sleep(500); await settle();
    for (let i = 0; i < 8 && all.slice(1).some((g) => g.E('G.state') !== 'play'); i++) { await frames(30); await sleep(150); A.E('NET.t.start=3'); await settle(); }
    await sleep(500); await frames(6);
    ok(A.E('G.state') === 'play' && A.E('G.net') === 'host' && A.E('PLAYERS.length') === n, 'host niet in potje');
    for (const g of all.slice(1)) ok(g.E('G.state') === 'play' && g.E('G.net') === 'guest' && g.E('PLAYERS.length') === n, g.name + ' niet in potje');
    ok(B.E('K.st.id') === 'volt' && B.E('K.cl.id') === 'mage', 'gast heeft verkeerde loadout');
    ok(A.E("PLAYERS.find(p=>p.name==='Gast').K.st.id") === 'volt', 'host simuleert verkeerde staf voor gast');
    ok(A.E("PLAYERS.find(p=>p.name==='Gast').K.sl") === 3, 'staff-level van gast niet gebruikt');
    god();
  });
  await run('gasten zien zombies, helden en effecten ' + tag, async () => {
    await frames(60 * 8); god();
    const hz = A.E('Z.length'), gz = B.E('Z.length');
    ok(A.E('G.kills') > 0, 'host doodt niets');
    ok(B.E('G.wave') === A.E('G.wave'), `wave niet gelijk ${B.E('G.wave')} vs ${A.E('G.wave')}`);
    ok(Math.abs(hz - gz) <= 6 || (hz > 0 && gz > 0), `zombies niet in sync host ${hz} gast ${gz}`);
    ok(B.E('PLAYERS.every(p=>p.P.x>0&&p.P.y>0)'), 'helden niet gepositioneerd');
    ok(B.E('PR.n+FX.length+TX.n') > 0, 'gast ziet geen projectielen of effecten');
    return { hostZ: hz, guestZ: gz, wave: A.E('G.wave'), kills: A.E('G.kills') };
  });
  await run('gast beweegt, gebruikt special en ability ' + tag, async () => {
    const x0 = A.E("PLAYERS.find(p=>p.name==='Gast').P.x");
    B.E("KEYS.a=true"); await frames(60); B.E("KEYS.a=false"); await frames(12);
    const x1 = A.E("PLAYERS.find(p=>p.name==='Gast').P.x");
    ok(x0 - x1 > 60 || x1 < 40, `gast bewoog niet bij de host (${x0} → ${x1})`);
    B.E('LOCAL.P.spT=0;LOCAL.P.abT=0;NET.trigger("sp");NET.trigger("ab")'); await frames(18);
    const sp = A.E("PLAYERS.find(p=>p.name==='Gast').P.spT"), ab = A.E("PLAYERS.find(p=>p.name==='Gast').P.abT");
    ok(sp > 1 && ab > 1, `special/ability van gast niet uitgevoerd (${sp}, ${ab})`);
    ok(B.E('LOCAL.P.spT') > 1, 'cooldown niet terug bij gast');
  });
  await run('kills, wave-beloningen en gedeelde burgers voor gasten ' + tag, async () => {
    const b0 = B.E('S.burgers'), xp0 = B.E('S.xp+S.lvl*1e6'), c0 = B.E('G.cleared');
    for (let i = 0; i < 40 && B.E('G.cleared') < c0 + 2; i++) { await frames(60); god(); }
    ok(B.E('G.cleared') >= c0 + 2, 'gast kreeg geen 2 voltooide waves door');
    await frames(30);
    ok(B.E('S.burgers') >= b0 + 40, `geen wave-burgers voor gast (${b0} → ${B.E('S.burgers')})`);
    ok(B.E('S.xp+S.lvl*1e6') > xp0, 'gast kreeg geen XP');
    ok(A.E("PLAYERS.find(p=>p.name==='Gast').kills") > 0 && B.E('S.kills') > 0, 'kills van gast niet geteld');
    const b1 = B.E('S.burgers'); A.E('dropBurger(P.x,P.y)'); await frames(90);
    ok(B.E('S.burgers') >= b1 + 50, 'gedeelde burger niet ontvangen');
    ok(A.E('NET.maxBytes') < 60000, 'snapshot te groot: ' + A.E('NET.maxBytes'));
    return { gastBurgers: B.E('S.burgers') - b0, snapKB: Math.round(A.E('NET.maxBytes') / 1024) };
  });
  await run('drukke wave: snapshots blijven klein genoeg ' + tag, async () => {
    A.E("G.phase='fight';G.toSpawn=0;for(let i=0;i<60;i++)Z.push(mkZombie(pick(['walker','runner','brute','spitter','shield'])))"); god();
    await frames(24); god();
    ok(B.E('Z.length') > 20, 'gast ziet de horde niet: ' + B.E('Z.length'));
    ok(A.E('NET.maxBytes') < 60000, 'snapshot te groot: ' + A.E('NET.maxBytes'));
    return { zombies: B.E('Z.length'), snapKB: Math.round(A.E('NET.maxBytes') / 1024) };
  });
  if (C) await run('een gast verlaat het potje, de rest speelt door ' + tag, async () => {
    C.E('NET.guestQuit()'); await settle(); await frames(12);
    ok(C.E('G.state') === 'res', 'vertrekkende gast niet naar resultaten');
    ok(A.E('PLAYERS.length') === n - 1 && A.E('G.state') === 'play', 'host heeft speler niet verwijderd');
    await frames(12); ok(B.E('PLAYERS.length') === n - 1, 'gast ziet vertrokken speler nog');
  });
  await run('neergeslagen, weer opstaan en game over voor iedereen ' + tag, async () => {
    A.E("(()=>{const g=PLAYERS.find(p=>p.name==='Gast');g.P.maxhp=100;g.P.hp=1;hurt(50,g)})()"); await frames(36);
    ok(A.E("PLAYERS.find(p=>p.name==='Gast').P.dead") === true && A.E('G.state') === 'play', 'gast niet neergeslagen of potje gestopt');
    ok(B.E('LOCAL.P.dead') === true, 'gast ziet niet dat hij neer is');
    A.E('for(const p of PLAYERS){p.P.maxhp=100;p.P.hp=1;p.P.dashT=0;p.P.shieldT=0;hurt(50,p)}'); await frames(6); await settle();
    for (let i = 0; i < 6 && B.E('G.state') === 'play'; i++) { A.E('NET.hostEnd(true)'); await settle(); }
    ok(A.E('G.state') === 'res' && B.E('G.state') === 'res', `geen game over (${A.E('G.state')}, ${B.E('G.state')})`);
    ok(B.dom.window.document.querySelector('#res').classList.contains('on'), 'gast ziet geen resultaten');
  });
  await run('terug naar de lobby, kamer blijft open ' + tag, async () => {
    A.E("showScreen('lobby')"); B.E("showScreen('lobby')"); await beat(1.6, 2);
    ok(A.E('G.state') === 'lobby' && B.E('G.state') === 'lobby' && !B.E('G.net'), 'niet terug in lobby');
    ok(A.E('NET.inRoom()') && B.E('NET.inRoom()'), 'kamer gesloten');
    ok(A.E('NET.roster.length') >= 2, 'roster leeg na potje');
    B.E('NET.leave()'); await settle(); await beat(1.6, 2);
    /* ging het 'bye'-bericht verloren, dan valt de gast na 7s zonder hello vanzelf weg */
    A.E('NET.roster.forEach(r=>{if(!r.host&&r.name==="Gast")r.seen-=8000})'); await beat(1.6, 2);
    ok(A.E('NET.roster.length') === (C ? (C.E('NET.inRoom()') ? 2 : 1) : 1), 'vertrokken gast staat nog in roster: ' + A.E('NET.roster.length'));
  });
  for (const b of all) allErrors.push(...b.errors);
}
(async () => {
  await suite(0, 3);
  await suite(0.2, 2);
  done(allErrors);
})();
