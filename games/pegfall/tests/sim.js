/* Pegfall Arena rules test: the match protocol, arcade rewards, validation, battle determinism and gacha pity.
   Two bots play complete matches against each other through the real commit/reveal protocol. */
const { load, ok } = require('./helpers');
const { E, errors } = load();
let failed = 0;
async function run(label, fn) {
  try { const r = await fn(); console.log('OK  ', label, r !== undefined ? JSON.stringify(r) : ''); }
  catch (e) { failed++; console.log('FAIL', label, e.stack.split('\n').slice(0, 3).join(' | ')); }
}
(async () => {
  await run('roster has every rarity, rates add up to 100%', () => {
    const r = E('({n:CHARS.length, per:RORDER.map(x=>CHARS.filter(c=>c.rarity===x).length), sum:Object.values(RARITY).reduce((a,b)=>a+b.w,0)})');
    ok(r.per.every((n) => n >= 2), 'a rarity has fewer than 2 fighters');
    ok(Math.abs(r.sum - 100) < 1e-9, 'rates sum to ' + r.sum);
    return r;
  });
  await run('battle simulation is deterministic', () => {
    const r = E(`(()=>{const A=[[{id:'pip',count:12},{id:'gumbo',count:4},{id:'vex',count:2}],[{id:'aurelion',count:2},{id:'quill',count:9},{id:'orrin',count:3}]];
      const a=runBattleHeadless(A,'s1'),b=runBattleHeadless(clone(A),'s1'),c=runBattleHeadless(clone(A),'s2');return {a:resultHash(a),same:resultHash(a)===resultHash(b),other:resultHash(c)};})()`);
    ok(r.same, 'same seed gave different results');
    return r;
  });
  await run('machine: hits fill a card\'s cost dots, a full card gives +1, three balls play at once', () => {
    const r = E(`(()=>{const m=new Machine(['pip','gumbo','vex'],makeRng('m'),{countdown:0});let inPlay=0;const rr=makeRng('x');
      while(!m.done){m.movePaddle(steerTarget(m,rr,0,.8),1/60,0);m.step(1/60);inPlay=Math.max(inPlay,m.balls.filter(b=>b.state==='play').length);m.events.length=0;}
      const rows=m.cards.map(c=>({id:c.id,cost:c.cost,hits:m.hits[c.id]||0,fighters:m.counts[c.id]||0,left:c.prog}));return {rows,inPlay};})()`);
    ok(r.inPlay === 3, 'three balls were never in play together');
    ok(r.rows.map((x) => x.cost).join() === '1,2,5', 'costs wrong: ' + r.rows.map((x) => x.cost));
    ok(r.rows.every((x) => x.fighters === Math.floor(x.hits / x.cost) && x.left === x.hits % x.cost), 'fighters do not match hits/cost');
    ok(r.rows[0].hits > 0, 'no hits at all');
    return r.rows;
  });
  await run('cards get random spots each round, never overlap, and can land close together', () => {
    const r = E(`(()=>{const h=AR.card,g=AR.ballR*2+3;let close=0,overlap=0,inside=true;const seen=new Set();
      for(let i=0;i<150;i++){const o=machineLayout(6,makeRng('L'+i));seen.add(Math.round(o[0].x)+','+Math.round(o[0].y));
        for(const p of o)if(p.x-h<0||p.x+h>AR.W||p.y-h-AR.dotsH<0||p.y+h>AR.padY-60)inside=false;
        let c=false;for(let a=0;a<o.length;a++)for(let b=a+1;b<o.length;b++){const gx=Math.abs(o[a].x-o[b].x)-2*h,gy=Math.abs(o[a].y-o[b].y)-2*h;if(gx<g-1e-6&&gy<g-1e-6)overlap++;if(Math.max(gx,gy)<40)c=true;}if(c)close++;}
      return {close:close/150,overlap,inside,distinct:seen.size};})()`);
    ok(r.overlap === 0, 'cards overlapped');
    ok(r.inside, 'a card left the machine');
    ok(r.close > 0.6, 'cards almost never land close together');
    ok(r.distinct > 100, 'layouts are not random');
    return r;
  });
  await run('countdown: balls wait 3 seconds before the round starts', () => {
    const r = E(`(()=>{const m=new Machine(['pip'],makeRng('c'));for(let i=0;i<170;i++)m.step(1/60);const before=m.balls.every(b=>b.state==='wait')&&m.t===0;for(let i=0;i<60;i++)m.step(1/60);return {before,after:m.balls.some(b=>b.state==='play')};})()`);
    ok(r.before && r.after, JSON.stringify(r));
    return r;
  });
  await run('impossible machine results are rejected', () => {
    const bad = E(`[validateCounts({pip:5,vex:2},['pip']),validateCounts({pip:5000},['pip']),validateCounts({pip:1.5},['pip']),validateCounts({pip:-1},['pip']),validateCounts([3],['pip']),validateCounts(null,['pip'])]`);
    ok(bad.every(Boolean), 'bad results accepted: ' + JSON.stringify(bad));
    ok(E("validateCounts({pip:12,gumbo:3},['pip','gumbo'])") === null, 'valid results rejected');
    ok(E("validateCounts({solaris:400},['solaris'])") === 'too many hits', 'expensive fighters not checked against their cost');
    return bad;
  });
  await run('bot skill matters: hard drops fewer balls and hits more than easy', () => {
    const r = E(`(()=>{const o={};for(const d of ['easy','hard']){let h=0,dr=0;for(let i=0;i<30;i++){const x=botMachineRun(d,makeRng(d+i),['pip','bramble','cinder','gumbo','wren']);h+=x.hits.length;dr+=x.drops;}o[d]={hits:h/30,drops:dr/30};}return o;})()`);
    ok(r.hard.hits > r.easy.hits && r.hard.drops < r.easy.drops, 'hard is not better');
    return r;
  });
  await run('gacha: Epic+ within 10 pulls, Legendary+ within 50', () => {
    const r = E(`(()=>{let worst10=0,worst50=0;for(let k=0;k<40;k++){const sv={owned:{},pity10:0,pity50:0,shards:0};const rng=makeRng('g'+k);let s10=0,s50=0;
      for(let i=0;i<300;i++){const [x]=gachaPull(sv,1,rng);s10++;s50++;if(RIDX[x.rarity]>=RIDX.epic){worst10=Math.max(worst10,s10);s10=0;}if(RIDX[x.rarity]>=RIDX.legendary){worst50=Math.max(worst50,s50);s50=0;}}}return {worst10,worst50};})()`);
    ok(r.worst10 <= 10 && r.worst50 <= 50, 'pity broken');
    return r;
  });
  await run('full bot-vs-bot matches agree on every army and score', async () => {
    E(`window.__results=[];window.__play=(d1,d2,seed)=>{const [tA,tB]=makeLoopback();const r1=makeRng(seed+'a'),r2=makeRng(seed+'b');const c1=botCollection(d1,r1),c2=botCollection(d2,r2);
      const mk=(t,side,d,c,r)=>new Match({transport:t,side,me:{name:d,st:botStarters(d,r,c),coll:c},headless:true,ai:{diff:d,rng:r,fast:true}});
      const A=mk(tA,0,d1,c1,r1),B=mk(tB,1,d2,c2,r2);const chk=()=>{if(A.phase==='over'&&B.phase==='over'&&!A.__done){A.__done=1;
        __results.push({pair:d1+'-'+d2,score:A.score.join('-'),agree:A.score.join()===B.score.join()&&JSON.stringify(A.army)===JSON.stringify(B.army),desync:!!(A.desync||B.desync),forfeit:!!(A.forfeit||B.forfeit),rounds:A.history.length});}};
      A.onEvent=chk;B.onEvent=chk;A.start();B.start();};
      [['easy','hard'],['medium','medium'],['hard','easy'],['hard','hard'],['medium','easy'],['easy','easy']].forEach((p,i)=>__play(p[0],p[1],'m'+i));`);
    const t0 = Date.now();
    while (E('__results.length') < 6 && Date.now() - t0 < 120000) await new Promise((r) => setTimeout(r, 50));
    const res = E('__results');
    ok(res.length === 6, 'only ' + res.length + ' matches finished');
    ok(res.every((x) => x.agree && !x.desync && !x.forfeit), 'clients disagreed: ' + JSON.stringify(res));
    ok(res.every((x) => /3/.test(x.score)), 'a match ended without 3 points');
    return res.map((x) => x.pair + ' ' + x.score);
  });
  if (errors.length) { console.log('page errors:', errors); failed++; }
  if (failed) { console.log(failed + ' check(s) failed'); process.exit(1); }
  console.log('Pegfall Arena rules: all checks passed');
  process.exit(0);
})();
