/* Staff Siege simulatie: speelt iedere staf, iedere class (met ability en special), iedere synergie
   en iedere boss (alle 3 fases) en controleert dat er geschoten, gedood en geen fout gegooid wordt. */
const { load, ok, run, done } = require('./helpers');
const { E, errors } = load();
const sim = (st, cl, wave, secs, boss) => E(`(()=>{S.staffs['${st}']=S.staffs['${st}']||{lvl:1,n:1,m:0,mx:0};S.classes['${cl}']=S.classes['${cl}']||{lvl:1,n:1,m:0,mx:0};
  G.state='lobby';beginRun(${wave},'${st}','${cl}');P.maxhp=P.hp=1e9;const n=${Math.round(secs * 60)};let phase=0;
  for(let i=0;i<n;i++){if(i===40){P.spT=0;staffSpecial();P.abT=0;useAbility()}
   ${boss ? 'if(G.intro)G.intro.t=0;if(G.boss){phase=Math.max(phase,G.boss.phase);if(i%90===0)G.boss.hp=Math.min(G.boss.hp,G.boss.maxhp*(1-i/n*1.2));G.boss.inv=Math.min(G.boss.inv,.2);if(G.boss.hp<=0&&G.boss.inv<=0)hitZ(G.boss,1,{noCrit:true})}' : ''}
   update(1/60);P.hp=1e9;if(G.boss)phase=Math.max(phase,G.boss.phase);if(G.state!=='play')break}
  const r={kills:G.kills,dmg:Math.round(G.dmg),syn:K.syn.map(s=>s.n),phase,bossDead:!!S.st.bossKills[${boss ? `(${wave}/25-1)%BOSSES.length` : 0}]};endRun(false);return JSON.stringify(r)})()`);
(async () => {
  const staffs = E('STAFFS.map(s=>s.id)'), classes = E('CLASSES.map(c=>c.id)');
  await run(`alle ${staffs.length} staffen vallen aan en doden zombies`, () => {
    const weak = [];
    for (const s of staffs) { const r = JSON.parse(sim(s, 'mage', 15, 8)); if (!(r.dmg > 0 && r.kills > 0)) weak.push(s + ':' + r.kills); }
    ok(!weak.length, 'geen kills: ' + weak.join(', '));
  });
  await run(`alle ${classes.length} classes (ability + passief) werken`, () => {
    const bad = [];
    for (const c of classes) { const r = JSON.parse(sim('oak', c, 20, 8)); if (!(r.dmg > 0)) bad.push(c); }
    ok(!bad.length, 'geen damage: ' + bad.join(', '));
  });
  await run('iedere synergie is actief met de juiste combinatie', () => {
    const syn = E("JSON.stringify(SYN.map(s=>[s.n,s.st.id||STAFFS.find(x=>x.type===s.st.type).id,s.cl]))");
    const bad = [];
    for (const [n, s, c] of JSON.parse(syn)) { const r = JSON.parse(sim(s, c, 10, 1)); if (!r.syn.includes(n)) bad.push(n); }
    ok(!bad.length, 'niet actief: ' + bad.join(', '));
    return { synergies: JSON.parse(syn).length };
  });
  await run('alle bosses: intro, 3 fases en verslagen', () => {
    const out = [];
    for (let w = 25; w <= 200; w += 25) { const r = JSON.parse(sim('oak', 'mage', w, 40, true)); ok(r.phase === 2, `boss wave ${w} haalde fase 3 niet (${r.phase})`); ok(r.bossDead, `boss wave ${w} niet verslagen`); out.push(w); }
    return { bosses: out.length };
  });
  done(errors);
})();
